from zope.testing import setupstack
import bobo
import json
import pkg_resources
import webtest

from .var import Vars
from .sample import users

demo_db = '''
<zodb>
  <demostorage>
  </demostorage>
</zodb>
'''

def make_app():
    app = bobo.Application(
        bobo_resources="""
                       twotieredkanban.apibase
                       """,
        bobo_handle_exceptions = False,
    )
    return pkg_resources.load_entry_point(
        'zc.zodbwsgi', 'paste.filter_app_factory', 'main')(
            app, {},
            configuration = demo_db,
            max_connections = '4',
            thread_transaction_manager = 'False',
            initializer = "twotieredkanban.apibase:initialize"
        )

class APITests(setupstack.TestCase):

    maxDiff = None

    def setUp(self):
        from ..apibase import config
        config(dict(auth='twotieredkanban.tests.auth'))

        @self.register
        def clear_auth():
            from .. import apibase
            apibase.auth = None

        self._app = make_app()
        self.app = self._test_app()
        self.vars = Vars()

    def _test_app(self):
        app = webtest.TestApp(self._app)
        app.extra_environ['HTTP_X_GENERATION'] = '0'
        return app

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

    def reset_generation(self):
        self.app.extra_environ.pop('HTTP_X_GENERATION', None)

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
                      site=dict(users=[],
                                boards=[]),
                      user=users[0],
                      ),
                 ),
            self.get('/site/poll').json)

    def test_add_board(self):
        self.get('/site/poll') # set generation
        data = dict(name='Dev', title='Development',
                    description='Let us develop things')
        self.assertEqual(
            dict(updates=
                 dict(generation=self.vars.generation,
                      site=dict(users=[],
                                boards=[data])
                      )
                 ),
            self.post('/site/boards', data).json)

    def test_add_project(self):
        self.post('/site/boards', dict(name='t', title='t', description=''))
        self.get('/board/t/poll') # set generation
        data = dict(title="do it", description="do the thing", order=42)
        self.assertEqual(
            dict(updates=
                 dict(generation=self.vars.generation,
                      tasks=dict(adds=[self.vars.project])
                      )
                 ),
            self.post('/board/t/projects', data).json)
        for name in data:
            self.assertEqual(data[name], self.vars.project[name])

    def test_update_project(self):
        self.post('/site/boards', dict(name='t', title='t', description=''))
        r = self.post('/board/t/projects',
                      dict(title='t', description='d', order=42))
        id = r.json['updates']['tasks']['adds'][0]['id']

        data = dict(title="do it", description="do the thing")
        self.assertEqual(
            dict(updates=
                 dict(generation=self.vars.generation,
                      tasks=dict(adds=[self.vars.project])
                      )
                 ),
            self.put('/board/t/tasks/' + id, data).json)
        for name in data:
            self.assertEqual(data[name], self.vars.project[name])

    def test_add_task(self):
        self.post('/site/boards', dict(name='t', title='t', description=''))
        r = self.post('/board/t/projects',
                      dict(title='t', description='d', order=42))
        id = r.json['updates']['tasks']['adds'][0]['id']
        data = dict(title="do it", description="do the thing", order=50,
                    size=1, blocked='no can do', assigned='test@example.com')
        self.assertEqual(
            dict(updates=
                 dict(generation=self.vars.generation,
                      tasks=dict(adds=[self.vars.task])
                      )
                 ),
            self.post('/board/t/project/' + id, data).json)
        for name in data:
            self.assertEqual(data[name], self.vars.task[name])

    def get_states(self):
        self.post('/site/boards', dict(name='t', title='t', description=''))
        self.reset_generation()
        return self.get('/board/t/poll').json['updates']['states']['adds']

    def test_move_project_to_new_state(self):
        states = self.get_states()
        [backlog_id] = [s['id'] for s in states if s['title'] == 'Backlog']
        [dev_id] = [s['id'] for s in states if s['title'] == 'Development']
        r = self.post('/board/t/projects',
                      dict(title='t', description='d', order=42))
        id = r.json['updates']['tasks']['adds'][0]['id']
        self.assertEqual(
            dict(updates=
                 dict(generation=self.vars.generation,
                      tasks=dict(adds=[self.vars.task])
                      )
                 ),
            self.put('/board/t/move/' + id,
                     dict(state_id=dev_id, order=7)).json)
        task = self.vars.task
        self.assertEqual(id, task['id'])
        self.assertEqual(dev_id, task['state'])
        self.assertEqual(7, task['order'])
        self.assertEqual(None, task['parent'])

    def test_move_task_to_new_project(self):
        states = self.get_states()
        r = self.post('/board/t/projects',
                      dict(title='p1', description='', order=1))
        p1id = r.json['updates']['tasks']['adds'][0]['id']
        r = self.post('/board/t/project/' + p1id,
                      dict(title='t1', description='', order=2))
        t1 = r.json['updates']['tasks']['adds'][0]
        r = self.post('/board/t/projects',
                      dict(title='p2', description='', order=3))
        p2id = r.json['updates']['tasks']['adds'][0]['id']
        self.assertEqual(
            dict(updates=
                 dict(generation=self.vars.generation,
                      tasks=dict(adds=[self.vars.task])
                      )
                 ),
            self.put('/board/t/move/' + t1['id'], dict(parent_id=p2id)).json)
        task = self.vars.task
        self.assertEqual(t1['id'], task['id'])
        self.assertEqual(t1['state'], task['state'])
        self.assertEqual(t1['order'], task['order'])
        self.assertEqual(p2id, task['parent'])

    def test_auth(self):
        # Note that this test, like the ones above use a very dump
        # auth plugin. We're just testing for proper interaction with
        # the auth plugin.

        # unauthenticated users can't get redirected to a login page
        from .. import apibase
        from . auth import BadAuth, NonAdminAuth
        apibase.auth = BadAuth
        app = self._test_app()
        r = app.get('/', status=302)
        self.assertEqual(r.headers['location'], 'http://localhost/auth/login')

        # Non admin users can't do admin things
        apibase.auth = NonAdminAuth
        app = self._test_app()
        self.app.post('/site/boards', dict(boards=[]), status=403)
