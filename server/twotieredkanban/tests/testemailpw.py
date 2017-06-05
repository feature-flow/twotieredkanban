import mock
import webtest
from zope.testing import setupstack

from .var import Vars

from .testapi import make_app

class EmailPWTests(setupstack.TestCase):

    maxDiff = None

    def setUp(self):
        from ..apibase import config
        config(dict(auth='twotieredkanban.emailpw'))

        @self.register
        def clear_auth():
            from .. import apibase
            apibase.auth = None

        self.app = make_app()


    def _test_app(self):
        return webtest.TestApp(self.app)

    def test_no_cookie(self):
        app = self._test_app()
        r = app.get('/', status=302)
        self.assertEqual(r.headers['location'], 'http://localhost/auth/login')

    def test_main(self):
        db = self.app.database
        with db.transaction() as conn:
            site = conn.root.sites['']
            from ..emailpw import invite_or_reset
            with mock.patch('twotieredkanban.emailpw.sendmail') as sendmail:
                invite_or_reset(site, "jaci@example.com", "Jaci Admi",
                                'http://example.com', True)
                (_, to, message), _ = sendmail.call_args
                token = (
                    message.split('http://example.com/auth/accept?token=')[1]
                    .split()[0])
            secret = site.emailpw.secret

            from .. import jwtauth
            email = jwtauth.decode(token, secret, 'email')
            self.assertEqual("jaci@example.com", email)
            user = site.emailpw.invites[email]
            self.assertEqual("Jaci Admi", user.name)
            self.assertEqual(True, user.admin)

            # Still no users:
            self.assertEqual([], list(site.users))

        # Now, we'll accept the invitation
        app = self._test_app()
        r = app.get('/auth/accept?token='+token)
        self.assertTrue(token in r.text)

        r.forms[0].set('password', 'secretsecret')
        r.forms[0].set('confirm', 'secretsecret')
        r2 = r.form.submit()
        self.assertEqual(r2.status_code, 302)
        self.assertEqual(r2.headers['location'], 'http://localhost/auth/login')

        with db.transaction() as conn:
            site = conn.root.sites['']
            self.assertEqual(
                [{"id": user.id, "nick": "", "email": "jaci@example.com",
                  "name": "Jaci Admi", "admin": True}],
                site.users)
            self.assertEqual([(user.id, user)],
                             list(site.emailpw.users_by_uid.items()))
            self.assertEqual([(user.email, user)],
                             list(site.emailpw.users_by_email.items()))
            self.assertEqual([], list(site.emailpw.invites.items()))

        # Now, we can log in
        r = app.get('/auth/login')
        r.forms[0].set('password', 'secretsecret')
        r.forms[0].set('email', user.email)
        r2 = r.forms[0].submit()
        self.assertEqual(r2.status_code, 302)
        self.assertEqual(r2.location, 'http://localhost/')

        # We can even make an invitation
        invite = dict(email="cas@example.com", name="Cas Emplo")
        with mock.patch('twotieredkanban.emailpw.sendmail'):
            app.post_json('/auth/invite', invite)

        with db.transaction() as conn:
            site = conn.root.sites['']
            self.assertEqual(
                [(invite['email'], invite)],
                [(k, dict(email=user.email, name=user.name))
                 for (k, user) in site.emailpw.invites.items()])
            self.assertEqual([(user.id, user)],
                             list(site.emailpw.users_by_uid.items()))
            self.assertEqual([(user.email, user)],
                             list(site.emailpw.users_by_email.items()))

    def test_update_profile(self):
        db = self.app.database
        from .. import emailpw
        with db.transaction() as conn:
            user = emailpw.User('user@example.com', 'Tester', 'tester')
            user.set_pw(b'secret')
            epw = emailpw.get_emailpw(conn.root.sites[''], True)
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
