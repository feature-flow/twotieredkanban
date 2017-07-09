from unittest import mock
from testvars import Vars
import webtest
from zope.testing import setupstack

from .testapi import make_app

class EmailPWTests(setupstack.TestCase):

    maxDiff = None

    def setUp(self):
        self.app = make_app()
        self.db = self.app.database

        from ..emailpw import bootstrap
        with mock.patch('twotieredkanban.emailpw.sendmail') as sendmail:
            bootstrap(self.db, 'localhost', "Test site",
                      "jaci@example.com", "Jaci Admi")
            self._sent = sendmail.call_args

    def test_bootstrap(self):
        (to, subject, message), _ = self._sent
        self.assertEqual("Jaci Admi <jaci@example.com>", to)
        self.assertEqual("Set your password for Test site", subject)
        self.assertTrue(
            message.strip().startswith("Your request to use Test site"))
        with self.db.transaction() as conn:
            auth = conn.root.sites['localhost'].auth
            self.assertEqual(0, len(auth.users_by_uid))
            self.assertEqual(0, len(auth.users_by_email))
            vars = Vars()
            self.assertEqual([('jaci@example.com', vars.user)],
                             list(auth.invites.items()))
            self.assertEqual(dict(id=vars.id, email='jaci@example.com',
                                  name="Jaci Admi", nick='', admin=True),
                             vars.user.data)
            self.assertEqual(True, vars.user.approved)
            self.assertEqual(1, vars.user.resets)

    @mock.patch('twotieredkanban.emailpw.sendmail')
    def test_request_access(self, sendmail):
        with self.db.transaction() as conn:
            auth = conn.root.sites['localhost'].auth
            message = auth.request('tester@example.com', 'Testy Tester',
                                   'http://localhost')
            self.assertEqual("Your request is awaiting approval.", message)
            self.assertEqual([], sendmail.mock_calls)
            self.assertEqual(0, len(auth.users_by_uid))
            self.assertEqual(0, len(auth.users_by_email))
            self.assertEqual(2, len(auth.invites))
            user = auth.invites['tester@example.com']
            self.assertEqual(dict(id=Vars().id, email='tester@example.com',
                                  name="Testy Tester", nick='', admin=False),
                             user.data)
            self.assertEqual(False, user.approved)
            self.assertEqual(0, user.resets)

            # Additional calls have no effect:
            message = auth.request('tester@example.com', 'Testy Tester',
                                   'http://localhost')
            self.assertEqual("Your request is awaiting approval.", message)
            self.assertEqual([], sendmail.mock_calls)
            self.assertEqual(0, len(auth.users_by_uid))
            self.assertEqual(0, len(auth.users_by_email))
            self.assertEqual(2, len(auth.invites))
            user = auth.invites['tester@example.com']
            self.assertEqual(dict(id=Vars().id, email='tester@example.com',
                                  name="Testy Tester", nick='', admin=False),
                             user.data)
            self.assertEqual(False, user.approved)
            self.assertEqual(0, user.resets)

    @mock.patch('twotieredkanban.emailpw.sendmail')
    def test_request_access_existing_user(self, sendmail):
        from ..emailpw import UserError
        with self.db.transaction() as conn:
            auth = conn.root.sites['localhost'].auth
            auth.users_by_email['tester@example.com'] = None
            with self.assertRaises(UserError):
                auth.request('tester@example.com', 'Testy Tester',
                             'http://localhost')
            self.assertEqual([], sendmail.mock_calls)
            self.assertEqual(0, len(auth.users_by_uid))
            self.assertEqual(1, len(auth.users_by_email))
            self.assertEqual(1, len(auth.invites))

    @mock.patch('twotieredkanban.emailpw.logger.error')
    @mock.patch('twotieredkanban.emailpw.sendmail')
    def test_request_approved_user(self, sendmail, log_error):
        with self.db.transaction() as conn:
            auth = conn.root.sites['localhost'].auth
            for i in range(11):
                message = auth.request('jaci@example.com', 'Testy Tester',
                                       'http://localhost')
                self.assertEqual("An email has been sent to jaci@example.com"
                                 " with a link to set your password",
                                 message)

                if i < 8:
                    self.assertEqual(i+1, len(sendmail.mock_calls))
                    self.assertEqual(0, len(log_error.mock_calls))

                    (to, subject, message), _ = sendmail.call_args
                    self.assertEqual("Jaci Admi <jaci@example.com>", to)
                    self.assertEqual("Set your password for Test site", subject)
                    self.assertTrue(
                        message.strip().startswith(
                            "Your request to use Test site"))
                else:
                    self.assertEqual(8, len(sendmail.mock_calls))
                    self.assertEqual(i-7, len(log_error.mock_calls))

                self.assertEqual(0, len(auth.users_by_uid))
                self.assertEqual(0, len(auth.users_by_email))
                vars = Vars()
                self.assertEqual([('jaci@example.com', vars.user)],
                                 list(auth.invites.items()))
                self.assertEqual(dict(id=vars.id, email='jaci@example.com',
                                      name="Jaci Admi", nick='', admin=True),
                                 vars.user.data)
                self.assertEqual(True, vars.user.approved)
                self.assertEqual(i+2, vars.user.resets)

    @mock.patch('twotieredkanban.emailpw.sendmail')
    def test_approval(self, sendmail):
        with self.db.transaction() as conn:
            auth = conn.root.sites['localhost'].auth
            _ = auth.request('tester@example.com', 'Testy Tester',
                                   'http://localhost')
            auth.approve('tester@example.com', 'http://localhost')
            (to, subject, message), _ = sendmail.call_args
            self.assertEqual('Testy Tester <tester@example.com>', to)
            self.assertEqual("Set your password for Test site", subject)
            self.assertTrue(
                message.strip().startswith(
                    "Your request to use Test site"))
            self.assertEqual(0, len(auth.users_by_uid))
            self.assertEqual(0, len(auth.users_by_email))
            user = auth.invites['tester@example.com']
            self.assertEqual(True, user.approved)
            self.assertEqual(1, user.resets)

    def parse_token(self, call_args, base_url=''):
        return (call_args[0][2].split(base_url + '/auth/setpw?token=')[1]
                .split()[0])

    @property
    def invite_token(self):
        return self.parse_token(self._sent, 'http://localhost')

    def test_setpw_approved(self):
        with self.db.transaction() as conn:
            auth = conn.root.sites['localhost'].auth
            token = self.invite_token
            from ..emailpw import UserError
            with self.assertRaisesRegex(
                UserError,
                "Password must have at least 9 characters",
                ):
                auth.setpw(token, 'pw', 'pw')
            with self.assertRaisesRegex(UserError, "Passwords don't match"):
                auth.setpw(token, 'pw'*99, 'pw')
            with self.assertRaisesRegex(UserError, "Password is too long"):
                auth.setpw(token, 'pw'*999, 'pw'*999)
            auth.setpw(token, ' ' + ('pw'*99), 'pw'*99 + ' ')
            self.assertEqual(0, len(auth.invites))
            self.assertEqual(1, len(auth.users_by_uid))
            self.assertEqual(1, len(auth.users_by_email))
            user = auth.users_by_email['jaci@example.com']
            self.assertTrue(auth.users_by_uid[user.id] is user)
            self.assertEqual(0, user.resets)
            self.assertEqual(1, user.generation)

    @mock.patch('twotieredkanban.emailpw.sendmail')
    def test_setpw_approved_expired_because_resets(self, sendmail):
        with self.db.transaction() as conn:
            auth = conn.root.sites['localhost'].auth
            token = self.invite_token
            # Make a pw set request, invalidating the previous one
            _ = auth.request('jaci@example.com', 'Testy Tester', '')
            from ..emailpw import UserError
            with self.assertRaisesRegex(
                UserError, "Sorry, your password request has expired"):
                auth.setpw(token, 'pw'*99, 'pw'*99)

    def test_setpw_approved_expired_because_timeout(self):
        with self.db.transaction() as conn:
            auth = conn.root.sites['localhost'].auth
            auth.invite_timeout = -1
            token = self.invite_token
            from ..emailpw import UserError
            with self.assertRaisesRegex(
                UserError, "Sorry, your password request has expired"):
                auth.setpw(token, 'pw'*99, 'pw'*99)
                self.assertEqual([], sendmail.mock_calls)

    @mock.patch('twotieredkanban.emailpw.sendmail')
    def test_forgot(self, sendmail):
        with self.db.transaction() as conn:
            auth = conn.root.sites['localhost'].auth

            # Can't reset pw of non user -- no email is sent
            from ..emailpw import User, UserError
            auth.forgot('nope@example.com', '')
            self.assertEqual([], sendmail.mock_calls)

            user = auth.invites['jaci@example.com']

            # We can for an approved user:
            self.assertEqual(1, user.resets)
            auth.forgot('jaci@example.com', '')
            self.assertEqual(2, user.resets)
            token = self.parse_token(sendmail.call_args)
            auth.setpw(token, 'pw'*99, 'pw'*99)
            self.assertEqual(0, len(auth.invites))
            self.assertTrue(user.email in auth.users_by_email)

            # And for regular users
            self.assertEqual(0, user.resets)
            auth.forgot('jaci@example.com', '')
            self.assertEqual(1, user.resets)
            token = self.parse_token(sendmail.call_args)
            auth.setpw(token, 'pw'*9, 'pw'*9)
            self.assertEqual(0, user.resets)
            self.assertEqual(2, user.generation)

    def _test_app(self):
        return webtest.TestApp(self.app)

    def _add_user(self, email, name='', admin=False, pw=None):
        from .. import emailpw
        with self.db.transaction() as conn:
            auth = conn.root.sites['localhost'].auth
            auth.users_by_email[email] = user = emailpw.User(
                email, name=name, admin=admin)
            if pw:
                user.setpw(pw)
            auth.users_by_uid[user.id] = user

    def _do_form(self, app, url, **data):
        r = app.get(url)
        for name, value in data.items():
            r.forms[0].set(name, value)
        return r.forms[0].submit()

    def _login(self, app, email, pw):
        return self._do_form(app, '/auth/login', email=email, password=pw)

    def test_web_no_cookie(self):
        app = self._test_app()
        r = app.get('/', status=302)
        self.assertEqual(r.headers['location'], 'http://localhost/auth/login')

    def test_web_setpw(self):
        token = self.invite_token
        with self.db.transaction() as conn:
            site = conn.root.sites['localhost']
            secret = site.auth.invite_secret

            from .. import jwtauth
            email = jwtauth.decode(token, secret)['email']
            self.assertEqual("jaci@example.com", email)
            user = site.auth.invites[email]
            self.assertEqual("Jaci Admi", user.name)
            self.assertEqual(True, user.admin)

            # Still no users:
            self.assertEqual([], list(site.users))

        # Now, we'll set our password
        app = self._test_app()
        r = app.get('/auth/setpw?token=' + token)
        self.assertTrue(token in r.text)
        self.assertTrue("Set your password for Test site." in r.text)

        r.forms[0].set('password', ' secretsecret')
        r.forms[0].set('confirm', 'secretsecret ')
        r2 = r.form.submit()
        print(r2.text)
        self.assertEqual(r2.status_code, 302)
        self.assertEqual(r2.headers['location'], 'http://localhost/auth/login')

        with self.db.transaction() as conn:
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

    def test_web_update_profile(self):
        db = self.app.database
        from .. import emailpw
        with db.transaction() as conn:
            user = emailpw.User('user@example.com', 'Tester', 'tester')
            user.setpw(b'secret')
            epw = conn.root.sites['localhost'].auth
            epw.users_by_uid[user.id] = user
            epw.users_by_email[user.email] = user

        app = self._test_app()
        self._login(app, user.email, 'secret')

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

    def test_web_promote(self):
        db = self.app.database
        from .. import emailpw
        with db.transaction() as conn:
            user = emailpw.User('user@example.com', 'Tester', 'tester')
            user.setpw(b'secret')
            uid = user.id
            epw = conn.root.sites['localhost'].auth
            epw.users_by_uid[user.id] = user
            epw.users_by_email[user.email] = user
            user = emailpw.User('admin@example.com', 'Super', 'super', True)
            user.setpw(b'supersecret')
            epw.users_by_uid[user.id] = user
            epw.users_by_email[user.email] = user

        app = self._test_app()
        self._login(app, 'admin@example.com', 'supersecret')

        # Now, we'll updata the user's admin flag
        r = app.put_json('/auth/users/' + uid + '/type', dict(admin=True))
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

        # Now demote
        r = app.put_json('/auth/users/' + uid + '/type', dict(admin=False))
        vars = Vars()
        self.assertEqual(
            {'updates': {'generation': vars.generation,
                         'site': {'boards': [],
                                  'users': vars.users},
                         'zoid': vars.zoid,
                         'user': vars.user}},
            r.json)
        self.assertEqual(False,
                         [u for u in vars.users if u['id'] == uid][0]['admin'])

    def test_web_request_access(self):
        app = self._test_app()
        r = app.get('/auth/request')
        r.forms[0].set('email', 'tester@example.com')
        r.forms[0].set('name', 'Testy Tester')
        r = r.forms[0].submit()
        self.assertTrue("Thank you" in r.text)

        with self.db.transaction() as conn:
            auth = conn.root.sites['localhost'].auth
            user = auth.invites['tester@example.com']
            self.assertEqual('Testy Tester', user.name)
            self.assertEqual(False, user.approved)
            self.assertEqual(False, user.admin)
            self.assertEqual(0, user.resets)

    @mock.patch('twotieredkanban.emailpw.sendmail')
    def test_web_approve_access(self, sendmail):
        with self.db.transaction() as conn:
            auth = conn.root.sites['localhost'].auth
            auth.request('u@example.com', 'User', '')

        email = 'a@example.com'
        pw = 'secret'
        self._add_user(email, 'Admin', admin=True, pw=pw)

        app = self._test_app()
        self._login(app, email, pw)
        self.assertEqual([], sendmail.mock_calls)
        app.put('/auth/requests/u@example.com')
        (to, subject, message), _ = sendmail.call_args
        self.assertEqual('User <u@example.com>', to)
        with self.db.transaction() as conn:
            auth = conn.root.sites['localhost'].auth
            user = auth.invites['u@example.com']
            self.assertEqual(True, user.approved)
            self.assertEqual(1, user.resets)

    @mock.patch('twotieredkanban.emailpw.sendmail')
    def test_web_forgot_pw(self, sendmail):
        app = self._test_app()
        email='tester@example.com'
        r = self._do_form(app, '/auth/forgot', email=email)
        self.assertTrue("an email was sent to the account" in r.text)
        self.assertEqual([], sendmail.mock_calls)

        self._add_user('tester@example.com', pw='secret')
        r = self._do_form(app, '/auth/forgot', email=email)
        self.assertTrue("an email was sent to the account" in r.text)
        (to, subject, message), _ = sendmail.call_args
        self.assertEqual(email, to)
        self.assertEqual('Reset your password for Test site', subject)
        with self.db.transaction() as conn:
            auth = conn.root.sites['localhost'].auth
            user = auth.setpw_user(self.parse_token(sendmail.call_args))
            self.assertEqual(email, user.email)
