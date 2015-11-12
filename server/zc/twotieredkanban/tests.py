from pprint import pprint
from zope.testing import setupstack, doctestcase
from zc.twotieredkanban.model import TaskValueError
import bobo
import boboserver
import doctest
import json
import mock
import os
import pdb
import pkg_resources
import unittest
import uuid
import webtest
import zc.twotieredkanban
import zc.twotieredkanban.persona

demo_db = '''
<zodb>
  <demostorage>
  </demostorage>
</zodb>
'''

class KanbanTests(setupstack.TestCase):

    maxDiff = None

    def setUp(self):
        self.globs = {}
        app = bobo.Application(
            bobo_resources="""
                       zc.twotieredkanban
                       boboserver:static('/dojo', '${:dojo}')
                       """,
            bobo_handle_exceptions = False,
            )
        self.app = pkg_resources.load_entry_point(
            'zc.zodbwsgi', 'paste.filter_app_factory', 'main')(
            app, {},
            configuration = demo_db,
            max_connections = '4',
            thread_transaction_manager = 'False',
            initializer =
            "zc.twotieredkanban:initialize_database('admin@example.com.com')"
            )
        self.db = self.app.database
        self.conn = self.db.open()

    def glob(self, func):
        self.globs[func.__name__] = func

    def test_app(self, email=None):
        extra_environ = {}
        tapp = webtest.TestApp(self.app, extra_environ=extra_environ)
        if email:
            zc.twotieredkanban.persona.set_cookie(tapp, self.conn.root, email)
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

    def get(self, app, *a, **kw):
        return self.update_app(app, app.get(*a, **kw))

    def post(self, app, *a, **kw):
        return self.update_app(app, app.post_json(*a, **kw))

    def put(self, app, *a, **kw):
        return self.update_app(app, app.put_json(*a, **kw))

    def delete(self, app, *a, **kw):
        return self.update_app(app, app.delete(*a, **kw))

    @doctestcase.file(
        'tests.rst',
        optionflags=doctest.ELLIPSIS | doctest.NORMALIZE_WHITESPACE)
    def test_basic(self):
        globs = self.globs
        globs.update(
            conn = self.conn,
            pprint = pprint,
            pdb = pdb,
            )

        for name in 'test_app get post put delete'.split():
            globs[name] = getattr(self, name)

        globs['_uuid1'] = 0
        def uuid1():
            globs['_uuid1'] += 1
            return uuid.UUID('%.32d' % globs['_uuid1'])

        self.mock('uuid.uuid1', side_effect=uuid1)
        self.mock('time.time', side_effect=lambda : 1406405514)

    def test_that_tasks_can_change_parentage(self):
        with self.conn.transaction_manager:
            self.conn.root.kanban = kanban = zc.twotieredkanban.model.Kanban(
                'admin@example.com')
            kanban.new_release('r1', 0.0)
            r1 = list(kanban.tasks)[-1]
            kanban.new_release('r2', 1.0)
            r2 = list(kanban.tasks)[-1]
            kanban.new_task(r1.id, 't3', 2.0)
            t3 = list(kanban.tasks)[-1]
            states = dict((s.label, s.id) for s in kanban.states)

        admin = self.test_app('admin@example.com')
        self.get(admin, '/poll') # set generation

        with self.assertRaisesRegexp(
            TaskValueError,
            "Can't make non-empty project into a task"
            ):
            self.put(admin, '/move/' + r1.id,
                 dict(state=states['Backlog'],
                      order=0.0, parent_id=r2.id)).json['updates'],

        self.assertEqual(
            self.put(admin, '/move/' + t3.id,
                     dict(state=states['Ready'],
                          order=4.0, parent_id=r2.id)).json['updates'],
            {u'generation': Var(), u'tasks': {u'adds': [
                {u'state': states['Ready'], u'order': 4.0,
                 u'parent': r2.id,
                 u'assigned': None, u'blocked': None, u'created': Var(),
                 u'complete': None, u'size': 1,
                 u'id': t3.id, u'name': u't3', u'description': u''},
                ]}},
            )
        self.assertEqual(
            self.put(admin, '/move/' + r1.id,
                     dict(state=states['Ready'],
                          order=5.0, parent_id=r2.id)).json['updates'],
            {u'generation': Var(), u'tasks': {u'adds': [
                {u'state': states['Ready'], u'order': 5.0,
                 u'parent': r2.id,
                 u'assigned': None, u'blocked': None, u'created': Var(),
                 u'complete': None, u'size': 1,
                 u'id': r1.id, u'name': u'r1', u'description': u''},
                ]}},
            )


class Var:

    v = None

    def __init__(self, name=None, ns=None):
        self.name = name
        self.ns = ns

    def __eq__(self, other):
        self.v = other
        if self.ns is not None and self.name:
            self.ns[name] = other
        return True

def test_suite():
    return unittest.makeSuite(KanbanTests)

