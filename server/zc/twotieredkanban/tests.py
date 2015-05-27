from pprint import pprint
from zope.testing import setupstack
import bobo
import boboserver
import doctest
import unittest
import manuel.capture
import manuel.doctest
import manuel.testing
import mock
import os
import pdb
import pkg_resources
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

def setUp(test):
    globs = test.globs

    def glob(func):
        globs[func.__name__] = func

    app = bobo.Application(
        bobo_resources="""
                   zc.twotieredkanban
                   boboserver:static('/dojo', '${:dojo}')
                   """,
        bobo_handle_exceptions = False,
        )
    app = pkg_resources.load_entry_point(
        'zc.zodbwsgi', 'paste.filter_app_factory', 'main')(
        app, {},
        configuration = demo_db,
        max_connections = '4',
        thread_transaction_manager = 'False',
        initializer =
        "zc.twotieredkanban:initialize_database('admin@example.com.com')"
        )
    globs['db'] = db = app.database
    globs['conn'] = conn = app.database.open()
    globs['pprint'] = pprint
    globs['pdb'] = pdb

    @glob
    def test_app(email=None):
        extra_environ = {}
        tapp = webtest.TestApp(app, extra_environ=extra_environ)
        if email:
            zc.twotieredkanban.persona.set_cookie(tapp, conn.root, email)
        return tapp

    def update_app(app, resp):
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

    @glob
    def get(app, *a, **kw):
        return update_app(app, app.get(*a, **kw))

    @glob
    def post(app, *a, **kw):
        return update_app(app, app.post_json(*a, **kw))

    @glob
    def put(app, *a, **kw):
        return update_app(app, app.put_json(*a, **kw))

    @glob
    def delete(app, *a, **kw):
        return update_app(app, app.delete(*a, **kw))

    globs['_uuid1'] = 0
    def uuid1():
        globs['_uuid1'] += 1
        return uuid.UUID('%.32d' % globs['_uuid1'])
    setupstack.context_manager(
        test, mock.patch('uuid.uuid1', side_effect=uuid1))
    setupstack.context_manager(
        test, mock.patch('time.time', side_effect=lambda : 1406405514))

def test_suite():
    return unittest.TestSuite((
        manuel.testing.TestSuite(
            manuel.doctest.Manuel(
                optionflags=doctest.ELLIPSIS | doctest.NORMALIZE_WHITESPACE
                ) + manuel.capture.Manuel(),
            'tests.rst', setUp=setUp),
        ))

