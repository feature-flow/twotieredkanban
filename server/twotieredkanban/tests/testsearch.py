"""Test search-functionality

These tests require a Postgres connection, because Postgres performes searches.
"""
import bobo
from newt.db.tests.base import TestCase
import pkg_resources
from pprint import pprint
import webtest

from ..site import get_site

from . import auth, sample
from .var import Vars

db_config = """
%%import newt.db

<zodb>
    <relstorage>
      keep-history false
      <newt>
        <postgresql>
          dsn %s
        </postgresql>
      </newt>
    </relstorage>
  </zodb>
"""


def make_app(dsn):
    app = bobo.Application(
        bobo_resources="twotieredkanban.apibase",
        bobo_configure="twotieredkanban.initializedb:config",
        bobo_handle_exceptions = False,
        dsn=dsn,
    )
    return pkg_resources.load_entry_point(
        'zc.zodbwsgi', 'paste.filter_app_factory', 'main')(
        app, {},
        configuration = db_config % dsn,
        max_connections = '4',
        thread_transaction_manager = 'False',
        initializer='twotieredkanban.initializedb:initialize',
        )


class SearchTests(TestCase):

    maxDiff = None

    def setUp(self):
        super().setUp()
        self._app = make_app(self.dsn)
        with self._app.database.transaction() as conn:
            get_site(conn.root, 'localhost', 'Test site').auth = auth.Admin()

        self.app = self._test_app()
        self.vars = Vars()

    def _test_app(self):
        app = webtest.TestApp(self._app)
        app.extra_environ['HTTP_X_GENERATION'] = '0'
        return app

    def test_archive_where(self):
        from ..apiboard import archive_where
        with self._app.database.transaction() as conn:
            site = get_site(conn.root, 'localhost')
            self.assertEqual(
                b"((state -> 'history' -> -1 ->> 'archived') = 'true') AND\n"
                b"  (((state -> 'board' ->> '::=>')::bigint) = 2)\n"
                b"ORDER BY (state -> 'history' -> -1 ->> 'start') DESC",
                archive_where(site))
            self.assertEqual(
                b"((state -> 'history' -> -1 ->> 'archived') = 'true') AND\n"
                b"  (((state -> 'board' ->> '::=>')::bigint) = 2) AND\n"
                b"  extract_text(class_name, state) @@"
                b" to_tsquery('english', 'test')\n"
                b"ORDER BY ts_rank_cd(array[0.1, 0.2, 0.4, 1],"
                b" extract_text(class_name, state),"
                b" to_tsquery('english', 'test')) DESC",
                archive_where(site, 'test'))

    def test_archive_search(self):
        with self._app.database.transaction() as conn:
            site = get_site(conn.root, 'localhost')
            site.add_board('test', '', '')
            board = site.boards['test']
            features = {}
            for task in sample.tasks:
                if not task.get('parent'):
                    features[task['id']] = task['title']
                    board.new_project(
                        task['title'], task['order'], task['description'])
            for feature_id in features:
                features[feature_id] = [task for task in board.tasks
                                        if task.title == features[feature_id]
                                        ][0]
            for task in sample.tasks:
                parent = task.get('parent')
                if parent:
                    board.new_task(
                        features[parent].id,
                        task['title'], task['order'], task['description'],
                        )

            feature_ids = [f.id for f in sorted((f for f in features.values()),
                                                key=lambda f: f.title)]
            for feature_id in feature_ids:
                board.archive_feature(feature_id)

        r = self.app.get('/board/test/archive', dict(size=2))
        self.assertEqual(4, r.json['count'])
        fvel, fauth = r.json['features']
        self.assertEqual('Velocity', fvel['title'])
        from pprint import pprint
        self.assertEqual(['Create test based on example',
                          'Define model',
                          'Design velocity display',
                          'Develop example',
                          'Server API velocity support',
                          'Velocity display',
                          'demo+model test'],
                         sorted(t['title'] for t in fvel['tasks']))
        self.assertEqual('Users and authentication', fauth['title'])

        r = self.app.get('/board/test/archive', dict(start=2, size=2))
        self.assertEqual(4, r.json['count'])
        fproto, fper = r.json['features']
        self.assertEqual('Persistence', fper['title'])
        self.assertEqual('Prototype board', fproto['title'])

        r = self.app.get('/board/test/archive', dict(size=2, text='api'))
        self.assertEqual(3, r.json['count'])
        self.assertEqual(['Persistence', 'Prototype board'],
                         [t['title'] for t in r.json['features']])

    def test_archive_search_isolation(self):
        with self._app.database.transaction() as conn:
            site = get_site(conn.root, 'localhost')
            site.add_board('test', '', '')
            board = site.boards['test']
            board.new_project('test', 0)
            board.archive_feature(list(board.tasks)[0].id)

            site.add_board('other', '', '')
            board = site.boards['other']
            board.new_project('test other board', 0)
            [p] = board.tasks
            board.archive_feature(list(board.tasks)[0].id)

            site = get_site(conn.root, 'other', 'Other site')
            site.add_board('test', '', '')
            board = site.boards['test']
            board.new_project('test other site', 0)
            board.archive_feature(list(board.tasks)[0].id)

        r = self.app.get('/board/test/archive', dict(size=99))
        self.assertEqual(1, r.json['count'])
        [f] = r.json['features']
        self.assertEqual('test', f['title'])

        r = self.app.get('/board/test/archive', dict(text='test'))
        [f] = r.json['features']
        self.assertEqual('test', f['title'])
