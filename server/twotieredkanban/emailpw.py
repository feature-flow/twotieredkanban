"""Email + password authentication
"""
import bobo
import BTrees.OOBTree
import persistent
import os
import passlib.context
import time
import urllib.parse
import uuid

from . import jwtauth
from .apiutil import Sync, post, put

pwcontext = passlib.context.CryptContext(schemes=["pbkdf2_sha256"])

class User(persistent.Persistent):

    pwhash = None

    def __init__(self, email, name='', nick='', admin=False):
        self.id = uuid.uuid1().hex
        self.email = email
        self.name = name
        self.nick = nick
        self.admin = admin

    def check_pw(self, pw):
        return pwcontext.verify(pw, self.pwhash)

    def set_pw(self, pw):
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

class BadPassword(Exception):
    pass

class EmailPW(persistent.Persistent):

    def __init__(self, site, invite_timeout=86400):
        self.site = site
        self.invite_timeout = invite_timeout
        self.users_by_uid = BTrees.OOBTree.BTree()
        self.users_by_email = BTrees.OOBTree.BTree()
        self.disabled = BTrees.OOBTree.BTree()
        self.invites = BTrees.OOBTree.BTree()
        self.invite_secret = os.urandom(24)
        self.secret = os.urandom(24)

    def invite_token(self, **data):
        return jwtauth.token(self.invite_secret, time=time.time(), **data)

    def decode_invite(self, token, key=None):
        return jwtauth.decode(token, self.invite_secret, key,
                              timeout=self.invite_timeout)

    def accept_email(self, token):
        return self.decode_invite(token, 'email')

    def accept_user(self, token):
        email = self.decode_invite(token, 'email')
        return email and self.invites.pop(email, None)

    def accept_invite(self, token, password, confirm):
        password = password.strip()
        confirm = confirm.strip()
        if password != confirm:
            raise BadPassword("Passwords don't match")
        elif len(password) > 999:
            raise BadPassword("Password is too long")
        elif len(password) < 9:
            raise BadPassword("Password must have at least 9 characters")

        user = self.accept_user(token)
        if not user or user.email in self.users_by_email:
            return "Sorry, your invitation has expired"
        user.set_pw(password.encode('utf-8'))
        self.users_by_email[user.email] = user
        self.users_by_uid[user.id] = user
        self.site.update_users(user.data for user in self.users_by_uid.values())
        return None

    def user(self, request):
        uid = jwtauth.load(request, self.secret, 'uid')
        if uid is not None:
            user = self.users_by_uid.get(uid)
            return user.data
        return None

    def login_creds(self, email, password):
        user = self.users_by_email.get(email)
        if not user:
            return bobo.redirect('/auth/login?message=Invalid+email.')

        password = password.strip()
        if not user.check_pw(password.encode('utf-8')):
            return bobo.redirect('/auth/login?message=Invalid+password.')

        response = bobo.redirect('/')
        jwtauth.save(response, self.secret, uid=user.id)

        return response

    def invite_or_reset(self, email, name, baseurl='', admin=False):
        user = self.users_by_email.get(email)
        if user is None:
            message = invite_message
            user = self.invites.get(email)
            if user is None:
                user = User(email, name, admin=admin)
                self.invites[email] = user
        else:
            message = reset_message

        token = self.invite_token(email=email)
        sendmail('punt_from', user.to, message % (baseurl, token))

    def login(self, request):
        return bobo.redirect('/auth/login')

    def subroute(self, base):
        return Subroute(base, self.site)


@bobo.subroute("", scan=True)
class Subroute(Sync):

    @bobo.get("/login")
    def get_login(self, message='Please log in'):
        return login_form % message

    @bobo.post("/login")
    def post_login(self, email, password):
        return self.context.auth.login_creds(email, password)

    @post("/invite")
    def invite(self, email, name=''):
        self.context.auth.invite_or_reset(
            email, name, self.base.request.host_url)
        return self.response()

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

    @bobo.get("/accept")
    def get_accept(self, token, message='Set your password'):
        email = self.context.auth.accept_email(token)
        return (pw_form % (message, token) if email
                else "Sorry, your invitation has expired")

        return pw_form % (message, token)

    @bobo.post("/accept")
    def post_accept(self, token, password, confirm):
        try:
            err_message = self.context.auth.accept_invite(
                token, password, confirm)
        except BadPassword as err:
            return bobo.redirect(
                '/auth/accept?token=%s&%s' % (token,
                                              urllib.parse.quote(str(err))))
        return err_message or bobo.redirect('/auth/login')

    @bobo.query('/logout')
    def logout(self):
        response = bobo.redirect('/auth/login')
        response.set_cookie(jwtauth.TOKEN, '')
        return response

    @bobo.get('/emailpw.css')
    def css(self):
        return css

css = ''

login_form = """<html>
<head><link rel="stylesheet" type="text/css" href="emailpw.css"></head>
<body><form action="login" method="POST" class="kb-emailpw"><fieldset>
  <legend>%s</legend>
  <p><label for="email">Enter your email</label>
     <input type="text" name="email"></p>
  <p><label for-"password">Enter your password</label>
     <input type="password" name="password"></p>
  <p><input type="submit" value="Log in"></p>
</fieldset></form></body></html>
"""

pw_form = """<html>
<head><link rel="stylesheet" type="text/css" href="emailpw.css"></head>
<body><form action="accept" method="POST" class="kb-emailpw"><fieldset>
  <legend>%s</legend>
  <p><label for-"password">
    Enter your password (9-999 characters, with no leading or trailing spaces)
     </label>
     <input type="password" name="password" maxlength="999"></p>
  <p><label for-"confirm">Confirm your password</label>
     <input type="password" name="confirm" maxlength="999"></p>
  <p><input type="hidden" name="token" value="%s">
     <input type="submit" value="Set password"></p>
</fieldset></form></body></html>
"""

invite_message = """
You've been invited to feature flow.  Please use this URL to set your password:

%s/auth/accept?token=%s

Love, feature-flow
"""

reset_message = """
Someone requested a password reset for your feature-flow account.  If this
was you, please visit:

%s/auth/reset?token=%s

Love, feature-flow
"""

sendmail = print
def config(config):
    global sendmail
    if 'sendmail' in config:
        sendmail = __import__(config['sendmail'], fromlist=['*'])

def bootstrap(db, site_name, email, name, admin=True, base_url=''):

    if isinstance(db, str):
        import ZODB.config
        with open(db) as f:
            db = ZODB.config.databaseFromFile(f)

    from .site import get_site
    with db.transaction() as conn:
        site = get_site(conn.root, site_name, True)
        if site.auth is None:
            site.auth = EmailPW(site)
        site.auth.invite_or_reset(
            email, name, base_url or 'https://' + site_name, admin)

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
    options = parser.parse_args(args)

    if options.base_url == 'd':
        options.base_url = 'http://localhost:8000'

    bootstrap(options.config, options.site, options.email, options.name,
              not options.non_admin, options.base_url)
