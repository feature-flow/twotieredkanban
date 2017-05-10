from pprint import pprint
from zope.testing import setupstack
import bobo
import json
import pkg_resources
import webtest

from .var import Vars

demo_db = '''
<zodb>
  <demostorage>
  </demostorage>
</zodb>
'''

class APITests(setupstack.TestCase):

    maxDiff = None

    def setUp(self):
        app = bobo.Application(
            bobo_resources="""
                       twotieredkanban.apibase
                       """,
            bobo_handle_exceptions = False,
            )
        self.app = pkg_resources.load_entry_point(
            'zc.zodbwsgi', 'paste.filter_app_factory', 'main')(
            app, {},
            configuration = demo_db,
            max_connections = '4',
            thread_transaction_manager = 'False',
            initializer = "twotieredkanban.apibase:initialize"
            )
        self.db = self.app.database
        self.conn = self.db.open()
        self.app = self.test_app()
        self.vars = Vars()

    def test_app(self):
        extra_environ = {}
        tapp = webtest.TestApp(self.app, extra_environ=extra_environ)
        return tapp

    def update_app(self, app, resp):
        try:
            json = resp.json
        except Exception:
            pass
        else:
            updates = json.get('updates')
            if updates:
                app.extra_environ['HTTP_X_GENERATION'] = str(
                    updates['generation'])

        return resp

    def get(self, *a, **kw):
        app = self.app
        return self.update_app(app, app.get(*a, **kw))

    def post(self, *a, **kw):
        app = self.app
        return self.update_app(app, app.post_json(*a, **kw))

    def put(self, *a, **kw):
        app = self.app
        return self.update_app(app, app.put_json(*a, **kw))

    def test_site_poll(self):
        self.assertEqual(
            dict(updates=
                 dict(generation=self.vars.generation,
                      site=dict(admins=['test@example.com'],
                                users=['test@example.com'],
                                boards=[])
                      )
                 ),
        self.get('/site/poll').json)

    def test_add_board(self):
        self.get('/site/poll') # set generation
        data = dict(name='Dev', title='Development',
                    description='Let us develop things')
        self.assertEqual(
            dict(updates=
                 dict(generation=self.vars.generation,
                      site=dict(admins=['test@example.com'],
                                users=['test@example.com'],
                                boards=[data])
                      )
                 ),
            self.post('/site/boards', data).json)
