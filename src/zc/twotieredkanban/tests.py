from pprint import pprint
import bobo
import boboserver
import doctest
import unittest
import manuel.capture
import manuel.doctest
import manuel.testing
import os
import pdb
import webtest
import zc.twotieredkanban


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
        bobo_resources=[
            zc.twotieredkanban,
            boboserver.static(
                '/dojo', os.path.join(os.path.dirname(__file__), 'dojo')),
            ],
        )
    app = pkg_resources.load_entry_point(
        'zc.zodbwsgi', 'paste.filter_app_factory', 'main')(
        app, {},
        configuration = demo_db,
        max_connections = '4',
        thread_transaction_manager = 'False',
        )
    globs['db'] = app.database
    globs['conn'] = app.database.open()
    globs['pprint'] = pprint
    globs['pdb'] = pdb

    @glob
    def test_app(email=None):
        extra_environ = {}
        if email:
            extra_environ['REMOTE_USER'] = email
        tapp = webtest.TestApp(app, extra_environ=extra_environ)
        return tapp


def test_suite():
    return unittest.TestSuite((
        manuel.testing.TestSuite(
            manuel.doctest.Manuel() + manuel.capture.Manuel(),
            'tests.rst', setUp=setUp),
        ))

