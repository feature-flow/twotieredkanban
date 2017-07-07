import mock
from testvars import Vars
import webtest
from zope.testing import setupstack

from .testapi import make_app

class EmailPWTests(setupstack.TestCase):

    maxDiff = None

    def setUp(self):
        self.app = make_app()

        from ..emailpw import bootstrap
        with mock.patch('twotieredkanban.emailpw.sendmail') as sendmail:
            bootstrap(self.app.database,
                      'localhost', "jaci@example.com", "Jaci Admi",
                      title="Test site")
            (to, subject, message), _ = sendmail.call_args
            self.assertEqual("Jaci Admi <jaci@example.com>", to)
            self.assertEqual("Invitation to Test site", subject)
            self.assertTrue(
                message.strip().startswith("You've been invited to Test site."))
            self.invite_token = (
                message.split('https://localhost/auth/accept?token=')[1]
                .split()[0])


    def _test_app(self):
        return webtest.TestApp(self.app)

    def test_no_cookie(self):
        app = self._test_app()
        r = app.get('/', status=302)
        self.assertEqual(r.headers['location'], 'http://localhost/auth/login')

    def test_main(self):
        db = self.app.database
        token = self.invite_token
        with db.transaction() as conn:
            site = conn.root.sites['localhost']
            secret = site.auth.invite_secret

            from .. import jwtauth
            email = jwtauth.decode(token, secret, 'email')
            self.assertEqual("jaci@example.com", email)
            user = site.auth.invites[email]
            self.assertEqual("Jaci Admi", user.name)
            self.assertEqual(True, user.admin)

            # Still no users:
            self.assertEqual([], list(site.users))

        # Now, we'll accept the invitation
        app = self._test_app()
        r = app.get('/auth/accept?token=' + token)
        self.assertTrue(token in r.text)
        self.assertTrue("Set password for Test site." in r.text)

        r.forms[0].set('password', ' secretsecret')
        r.forms[0].set('confirm', 'secretsecret ')
        r2 = r.form.submit()
        print(r2.text)
        self.assertEqual(r2.status_code, 302)
        self.assertEqual(r2.headers['location'], 'http://localhost/auth/login')

        with db.transaction() as conn:
            site = conn.root.sites['localhost']
            self.assertEqual(
                [{"id": user.id, "nick": "", "email": "jaci@example.com",
                  "name": "Jaci Admi", "admin": True}],
                site.users)
            self.assertEqual([(user.id, user)],
                             list(site.auth.users_by_uid.items()))
            self.assertEqual([(user.email, user)],
                             list(site.auth.users_by_email.items()))
            self.assertEqual([], list(site.auth.invites.items()))

        # Now, we can log in
        r = app.get('/auth/login')
        self.assertTrue("Log into Test site." in r.text)
        r.forms[0].set('password', ' secretsecret ')
        r.forms[0].set('email', user.email)
        r2 = r.forms[0].submit()
        self.assertEqual(r2.status_code, 302)
        self.assertEqual(r2.location, 'http://localhost/')

        # We can even make an invitation
        invite = dict(email="cas@example.com", name="Cas Emplo")
        with mock.patch('twotieredkanban.emailpw.sendmail'):
            app.post_json('/auth/invites', invite)

        with db.transaction() as conn:
            site = conn.root.sites['localhost']
            invite['admin'] = False
            self.assertEqual(
                [(invite['email'], invite)],
                [(k, dict(email=user.email, name=user.name, admin=user.admin))
                 for (k, user) in site.auth.invites.items()])
            self.assertEqual([(user.id, user)],
                             list(site.auth.users_by_uid.items()))
            self.assertEqual([(user.email, user)],
                             list(site.auth.users_by_email.items()))

        # Make an admin invitation
        invite = dict(email="tester@example.com", name="", admin=True)
        with mock.patch('twotieredkanban.emailpw.sendmail'):
            app.post_json('/auth/invites', invite)

        with db.transaction() as conn:
            site = conn.root.sites['localhost']
            self.assertEqual(
                [(invite['email'], invite)],
                [(k, dict(email=user.email, name=user.name, admin=user.admin))
                 for (k, user) in site.auth.invites.items()
                 if k == "tester@example.com"])

    def test_update_profile(self):
        db = self.app.database
        from .. import emailpw
        with db.transaction() as conn:
            user = emailpw.User('user@example.com', 'Tester', 'tester')
            user.set_pw(b'secret')
            epw = conn.root.sites['localhost'].auth
            epw.users_by_uid[user.id] = user
            epw.users_by_email[user.email] = user

        app = self._test_app()
        r = app.get('/auth/login')
        r.forms[0].set('password', 'secret')
        r.forms[0].set('email', user.email)
        r2 = r.forms[0].submit()

        # Now, we'll updata the user's profile
        r = app.put_json('/auth/user',
                         dict(name='name', nick='nick', email='e@example.com'))
        vars = Vars()
        self.assertEqual(
            {'updates': {'generation': vars.generation,
             'site': {'boards': [],
                      'users': [{'admin': False,
                                 'email': 'e@example.com',
                                 'id': vars.id,
                                 'name': 'name',
                                 'nick': 'nick'}]},
             'user': {'admin': False,
                      'email': 'e@example.com',
                      'id': vars.id,
                      'name': 'name',
                      'nick': 'nick'},
             'zoid': vars.zoid}},
            r.json)

    def test_promote(self):
        db = self.app.database
        from .. import emailpw
        with db.transaction() as conn:
            user = emailpw.User('user@example.com', 'Tester', 'tester')
            user.set_pw(b'secret')
            uid = user.id
            epw = conn.root.sites['localhost'].auth
            epw.users_by_uid[user.id] = user
            epw.users_by_email[user.email] = user
            user = emailpw.User('admin@example.com', 'Super', 'super', True)
            user.set_pw(b'supersecret')
            epw.users_by_uid[user.id] = user
            epw.users_by_email[user.email] = user

        app = self._test_app()
        r = app.get('/auth/login')
        r.forms[0].set('password', 'supersecret')
        r.forms[0].set('email', 'admin@example.com')
        r2 = r.forms[0].submit()

        # Now, we'll updata the user's admin flag
        r = app.put_json('/auth/users/' + uid, dict(admin=True))
        vars = Vars()
        self.assertEqual(
            {'updates': {'generation': vars.generation,
                         'site': {'boards': [],
                                  'users': vars.users},
                         'zoid': vars.zoid,
                         'user': vars.user}},
            r.json)
        self.assertEqual(True,
                         [u for u in vars.users if u['id'] == uid][0]['admin'])
