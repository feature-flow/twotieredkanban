name, version = 'twotieredkanban', '0'

install_requires = [
    'oauthlib',
    'bobo',
    'gevent',
    'requests',
    'PyJWT',
    'setuptools',
    'zc.generationalset',
    'zc.zodbwsgi',
    'zope.exceptions',                  # XXX required by zodbwsgi
    'pq',
    'psycopg2transaction',
    ]
extras_require = dict(test=['manuel', 'mock', 'zope.testing', 'webtest'])

entry_points = """
[zc.buildout]
default = twotieredkanban.kbrecipe:Recipe

[paste.server_runner]
main = twotieredkanban.server:runner
"""

from setuptools import setup

long_description=open('README.rst').read()

setup(
    author = 'Jim Fulton',
    author_email = 'jim@zope.com',
    license = 'ZPL 2.1',

    name = name, version = version,
    long_description = long_description,
    description = long_description.strip().split('\n')[1],
    packages = [name, name],
    package_dir = {'': 'server'},
    install_requires = install_requires,
    zip_safe = False,
    entry_points=entry_points,
    package_data = {name: ['*.txt', '*.test', '*.html']},
    extras_require = extras_require,
    tests_require = extras_require['test'],
    test_suite = name+'.tests.test_suite',
    )
