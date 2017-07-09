"""Email + password authentication
"""
import bobo
import BTrees.OOBTree
import jinja2
import logging
import os
import passlib.context
import persistent
import time
import urllib.parse
import uuid

from . import jwtauth
from .apiutil import Sync, get, post, put

logger = logging.getLogger(__name__)

pwcontext = passlib.context.CryptContext(schemes=["pbkdf2_sha256"])

MAX_RESETS = 9

class User(persistent.Persistent):

    pwhash = None
    approved = True
    resets = 0
    generation = 0
    note = ''

    def __init__(self, email, name='', nick='', admin=False, approved=False):
        self.id = uuid.uuid1().hex
        self.email = email
        self.name = name
        self.nick = nick
        self.admin = admin
        self.approved = approved

    def check_pw(self, pw):
        return pwcontext.verify(pw, self.pwhash)

    def setpw(self, pw):
        self.pwhash = pwcontext.hash(pw)

    @property
    def to(self):
        if self.name:
            return '%s <%s>' % (self.name, self.email)
        else:
            return self.email

    @property
    def data(self):
        return dict(id=self.id, email=self.email, name=self.name,
                    nick=self.nick, admin=self.admin)

    @property
    def request_data(self):
        return dict(email=self.email, name=self.name,
                    approved=self.approved)

class UserError(Exception):
    pass

class BadPassword(UserError):
    pass

class EmailPW(persistent.Persistent):

    def __init__(self, site, invite_timeout=86400):
        self.site = site
        self.invite_timeout = invite_timeout
        self.users_by_uid = BTrees.OOBTree.BTree()
        self.users_by_email = BTrees.OOBTree.BTree()
        self.disabled = BTrees.OOBTree.BTree()
        self.invites = BTrees.OOBTree.BTree() # email -> User
        self.invite_secret = os.urandom(24)
        self.secret = os.urandom(24)

    def setpw_token(self, **data):
        return jwtauth.token(self.invite_secret, time=time.time(), **data)

    def decode_setpw(self, token):
        return jwtauth.decode(token, self.invite_secret, self.invite_timeout)

    def bootstrap(self, email, name, base_url):
        assert email not in self.invites and email not in self.users_by_email
        self.invites[email] = user = User(email, name,
                                          approved=True, admin=True)
        self.send_pw_email(user, base_url)

    def send_pw_email(self, user, base_url):
        user.resets += 1
        if user.resets <= MAX_RESETS:
            action = "Reset" if user.pwhash else "Set"
            subject = "%s your password for %s" % (action, self.site.title)
            token = self.setpw_token(
                email=user.email,
                resets=user.resets,
                generation=user.generation,
                )
            message = (reset_message if user.pwhash else approve_message) % (
                self.site.title, base_url, token)
            sendmail(user.to, subject, message)
        else:
            logger.error("Too many resets for %s" % user.email)

    def setpw_user(self, token):
        data = self.decode_setpw(token)
        if data:
            email = data['email']
            user = self.invites.get(email) or self.users_by_email.get(email)
            if (user and
                user.resets == data['resets'] and
                user.generation == data['generation']
                ):
                return user

        return None

    def setpw(self, token, password, confirm):
        user = self.setpw_user(token)
        if user is not None:
            password = password.strip()
            confirm = confirm.strip()
            if password != confirm:
                raise BadPassword("Passwords don't match")
            elif len(password) > 999:
                raise BadPassword("Password is too long")
            elif len(password) < 9:
                raise BadPassword("Password must have at least 9 characters")
            user.setpw(password.encode('utf-8'))
            user.resets = 0
            user.generation += 1
            if user.email in self.invites:
                self.invites.pop(user.email)
                self.users_by_email[user.email] = user
                self.users_by_uid[user.id] = user
                self.site.update_users(user.data
                                       for user in self.users_by_uid.values())
            return
        else:
            raise UserError("Sorry, your password request has expired")

    def request(self, email, name, baseurl):
        if email in self.users_by_email:
            raise UserError("There is already a user with that email adress.")
        user = self.invites.get(email)
        if user is not None:
            if user.approved:
                self.send_pw_email(user, baseurl)
                return ("An email has been sent to %s"
                        " with a link to set your password" % email)
        else:
            self.invites[email] = User(email, name)

        return "Your request is awaiting approval."

    def approve(self, email, base_url):
        user = self.invites.get(email)
        if user is not None:
            user.approved = True
            self.send_pw_email(user, base_url)

    def forgot(self, email, base_url):
        user = self.users_by_email.get(email) or self.invites.get(email)
        if user is not None:
            self.send_pw_email(user, base_url)

    def user(self, request):
        data = jwtauth.load(request, self.secret)
        uid = data and data.get('uid')
        if uid:
            user = self.users_by_uid.get(uid)
            generation = data.get('generation')
            if generation == user.generation:
                return user.data
        return None

    def login_creds(self, email, password):
        user = self.users_by_email.get(email)
        if not user:
            raise UserError("Invalid email or password.")

        password = password.strip()
        if not user.check_pw(password.encode('utf-8')):
            raise UserError("Invalid email or password.")

        return user

    def login(self, request):
        return bobo.redirect('/auth/login')

    def subroute(self, base):
        return Subroute(base, self.site)

templates = jinja2.Environment(
    loader=jinja2.PackageLoader('twotieredkanban', 'emailpw-templates'),
    autoescape=jinja2.select_autoescape(['html'])
)
template = templates.get_template

@bobo.subroute("", scan=True)
class Subroute(Sync):

    @bobo.get("/login")
    def get_login(self, message=''):
        return template('login.html').render(title=self.context.title,
                                             message=message)

    @bobo.post("/login")
    def post_login(self, email, password):
        try:
            user = self.context.auth.login_creds(email, password)
        except UserError as err:
            response = bobo.redirect(
                '/auth/login?message=' + urllib.parse.quote(str(err)))
        else:
            response = bobo.redirect('/')
            jwtauth.save(response, self.context.auth.secret,
                         uid=user.id, generation=user.generation)

        return response


    @bobo.get("/request")
    def get_request(self, message=''):
        return template('request.html').render(title=self.context.title,
                                               message=message)

    @bobo.post("/request")
    def post_request(self, email, name):
        try:
            message = self.context.auth.request(email, name,
                                                self.base.request.host_url)
        except UserError as err:
            return bobo.redirect(
                '/auth/request?message=' + urllib.parse.quote(str(err)))
        else:
            return template('message.html').render(
                title=self.context.title,
                heading="Thank you.",
                message="""
                Thank you for your request to use %s.
                Your request will be reviewed and, if approved, you
                will recieve an email with a link to set your
                password.""" % self.context.title,
                )

    @put("/requests/:email")
    def approve_request(self, email):
        self.context.auth.approve(email, self.base.request.host_url)
        return self.response()

    @get("/requests")
    def admin_requests(self):
        return self.response(
            requests=[i.request_data
                      for i in self.context.auth.invites.values()])

    @put("/user")
    def put_user(self, name=None, email=None, nick=None):
        emailpw = self.context.auth
        user = emailpw.users_by_uid.get(self.base.user['id'])
        if name is not None:
            user.name = name
        if email is not None:
            user.email = email
        if nick is not None:
            user.nick = nick
        self.context.update_users(
            user.data for user in emailpw.users_by_uid.values())
        return self.response(send_user=user.data)

    @put("/users/:id/type")
    def admin_set_user_type(self, id, admin):
        emailpw = self.context.auth
        user = emailpw.users_by_uid.get(id)
        user.admin = admin
        self.context.update_users(
            user.data for user in emailpw.users_by_uid.values())
        return self.response()

    @bobo.get("/setpw")
    def get_setpw(self, token, message=''):
        user = self.context.auth.setpw_user(token)
        if user is not None:
            return template('pw.html').render(
                action='Reset' if user.pwhash else 'Set',
                title=self.context.title,
                message=message,
                token=token,
                )
        else:
            return ('<div class="accept-expired">'
                    'Sorry, your request has expired</div>')

    @bobo.post("/setpw")
    def post_setpe(self, token, password, confirm):
        try:
            self.context.auth.setpw(token, password, confirm)
        except UserError as err:
            return bobo.redirect(
                'setpw?token=%s&%s' % (token,
                                       urllib.parse.quote(str(err))))

        return bobo.redirect('login')

    @bobo.get("/forgot")
    def get_forgot(self):
        return template('forgot.html').render()

    @bobo.post("/forgot")
    def post_forgot(self, email):
        self.context.auth.forgot(email, self.base.request.host_url)
        return template('message.html').render(
            title=self.context.title,
            heading="Thank you.",
            message="""
            If the email address you entered was associated with an account,
            an email was sent to the account with a link to set your password.
            """)

    @bobo.query('/logout')
    def logout(self):
        response = bobo.redirect('/auth/login')
        response.set_cookie(jwtauth.TOKEN, '')
        return response

    @bobo.get('/emailpw.css', content_type="text/css")
    def css(self):
        return template('emailpw.css').render()

approve_message = """
Your request to use %s
has been approved.

To set your password, please visit:

%s/auth/setpw?token=%s

If you didn't request to use this site, you may ignore this message.
"""

reset_message = """
Someone has requested a password reset for your
%s account.

To reset your password, visit:

%s/auth/setpw?token=%s

If you didn't request a password reset, you may ignore this message.
"""

sendmail = print
def config(config):
    global sendmail
    if 'sendmail' in config:
        mod, expr = config['sendmail'].split(':')
        sendmail = eval(expr, __import__(mod, fromlist=['*']).__dict__)

def bootstrap(db, site_name, title, email, name, base_url=''):

    if isinstance(db, str):
        import ZODB.config
        with open(db) as f:
            db = ZODB.config.databaseFromFile(f)

    from .site import get_site
    with db.transaction() as conn:
        site = get_site(conn.root, site_name, title)
        if site.auth is None:
            site.auth = EmailPW(site)
        site.auth.bootstrap(email, name, base_url or 'http://' + site_name)

def bootstrap_script(args=None):
    """Invite a user to use a site, and create the site, if necessary
    """
    import argparse
    parser = argparse.ArgumentParser(bootstrap_script.__doc__)
    parser.add_argument('config', help='ZODB config file')
    parser.add_argument('site')
    parser.add_argument('email')
    parser.add_argument('name', default='')
    parser.add_argument('-b', '--base-url', default='', help="""
    Specify the base URL path. If not given, then https://<site> will
    be used, where site is the value of the site argument.  If the
    special value "d" is given, then http://localhost:8000 is used.
    """)
    parser.add_argument('-A', '--non-admin', action='store_true')
    parser.add_argument('-t', '--title',
                        help="Create a site with the given title")
    options = parser.parse_args(args)

    if options.base_url == 'd':
        options.base_url = 'http://localhost:8000'

    bootstrap(options.config, options.site, options.email, options.name,
              not options.non_admin, options.base_url, options.title)
