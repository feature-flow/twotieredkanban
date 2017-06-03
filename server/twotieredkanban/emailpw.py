"""Email + password authentication
"""
import bobo
import BTrees.OOBTree
import hashlib
import persistent
import os
import uuid

from . import jwtauth
from .apiutil import Sync, post

def hash(salt, pw):
    return salt + hashlib.pbkdf2_hmac('sha256', pw, salt, 100000)

class User(persistent.Persistent):

    pwhash = None

    def __init__(self, email, name='', nick='', admin=False):
        self.id = uuid.uuid1().hex
        self.email = email
        self.name = name
        self.nick = nick
        self.admin = admin

    def check_pw(self, pw):
        return hash(self.pwhash[:32], pw) == self.pwhash

    def set_pw(self, pw):
        self.pwhash = hash(os.urandom(32), pw)

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


class EmailPW(persistent.Persistent):

    def __init__(self):
        self.users_by_uid = BTrees.OOBTree.BTree()
        self.users_by_email = BTrees.OOBTree.BTree()
        self.disabled = BTrees.OOBTree.BTree()
        self.invites = BTrees.OOBTree.BTree()
        self.secret = os.urandom(24)

    def token(self, **data):
        return jwtauth.token(self.secret, **data)

    def decode(self, token, key=None):
        return jwtauth.decode(token, self.secret, key)

def get_emailpw(site, create=False):
    try:
        emailpw = site.emailpw
    except AttributeError:
        emailpw = EmailPW() # Return dummy to simplfy logic
        if create:
            site.emailpw = emailpw
    return emailpw

def user(base):
    uid = jwtauth.load(base.request, base.root.secret)['uid']
    if uid is not None:
        emailpw = get_emailpw(base.site)
        if emailpw is not None:
            return emailpw.users_by_uid.get(uid).data
    return None

def invite_or_reset(site, email, name, baseurl='', admin=False):
    emailpw = get_emailpw(site, True)
    user = emailpw.users_by_email.get(email)
    if user is None:
        message = invite_message
        user = emailpw.invites.get(email)
        if user is None:
            user = User(email, name, admin=admin)
            emailpw.invites[email] = user
    else:
        message = reset_message

    token = emailpw.token(email=email)
    sendmail('punt_from', user.to, message % (baseurl, token))

def login():
    return bobo.redirect('/auth/login')

@bobo.subroute("", scan=True)
class Subroute(Sync):

    def __init__(self, base, site):
        super().__init__(base, site)
        self.check = base.check

    @bobo.get("/login")
    def get_login(self, message='Please log in'):
        return login_form % message

    @bobo.post("/login")
    def post_login(self, email, password):
        emailpw = get_emailpw(self.context)
        user = emailpw.users_by_email.get(email)
        if not user:
            return bobo.redirect('/auth/login?message=Invalid+email.')
        if not user.check_pw(password.encode('utf-8')):
            return bobo.redirect('/auth/login?message=Invalid+password.')

        response = bobo.redirect('/')
        jwtauth.save(response, self.base.root.secret, uid=user.id)
        return response

    @post("/invite")
    def invite(self, email, name=''):
        invite_or_reset(self.context, email, name, self.base.request.host_url)
        return self.response()

    @bobo.get("/accept")
    def get_accept(self, token, message='Set your password'):
        emailpw = get_emailpw(self.context)
        email = emailpw.decode(token, 'email')
        if not email or not emailpw.invites.get(email):
            return "Sorry, your invitation has expired"

        return pw_form % (message, token)

    @bobo.post("/accept")
    def post_accept(self, token, password, confirm):
        if password != confirm:
            return bobo.redirect(
                '/auth/accept?token=%s&message=Passwords+do+not+match' % token)
        if len(password) > 999:
            return bobo.redirect(
                '/auth/accept?token=%s&message=Password+is+too_long' % token)
        if len(password) < 9:
            return bobo.redirect(
                '/auth/accept?token=%s'
                '&message=Password+must+have+at+least+9+characters' % token)

        emailpw = get_emailpw(self.context)
        email = emailpw.decode(token, 'email')
        user = email and emailpw.invites.pop(email)
        if not user or email in emailpw.users_by_email:
            return "Sorry, your invitation has expired"
        user.set_pw(password.encode('utf-8'))
        emailpw.users_by_email[email] = user
        emailpw.users_by_uid[user.id] = user
        self.context.update_users(user.data
                                  for user in emailpw.users_by_uid.values())
        return bobo.redirect('/auth/login')

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
  <p><label for-"password">Enter your password</label>
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

def invite_or_reset_script():
    import argparse
    parser = argparse.ArgumentParser("Send a reset email")
    parser.add_argument('config', help='ZODB config file')
    parser.add_argument('email')
    parser.add_argument('name', default='')
    parser.add_argument('-s', '--site', default='')
    parser.add_argument('-b', '--base-url', default='')
    parser.add_argument('--admin', action='store_true')

    options = parser.parse_args()
    import ZODB.config
    with open(options.config) as f:
        db = ZODB.config.databaseFromFile(f)
    from twotieredkanban.emailpw import invite_or_reset_script
    with db.transaction() as conn:
        site = conn.root.sites[options.site]
        invite_or_reset(site, options.email, options.name, options.base_url,
                        admin=options.admin)
