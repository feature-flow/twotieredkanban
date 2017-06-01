Building the app
================

There are currently 2 modes:

demo
  Data are stored in the browser and can't be shared.

server
  Data are stored on the server.

Note that we're still punting on authentication and user management.

Demo mode
=========

Build::

  npm install
  webpack --env.demo

Run
  You have 2 options.

  If you're using Chrome:
    Open ``demo/index.html`` in your browser. If the browser
    generates a ``file::`` url by following the symbolic link, edit the URL
    to end in ``demo/index.html``.

  If you're using Firefox or Safari
    The browsers don't seem to work correctly with ``file://`` urls,
    so you'll want to host the demo files with a web server.  You can
    use the express server. See express/README.rst

    We're mostly developing with Chrome. There are a number of
    problems using other browsers at this point.

Server mode
===========

To build, run the buildout. This will build the Python app, run npm,
and webpack.

Create a local ``kanban`` Postgres database.  Alternatively, supply an
alternate connection string when you run buildout::

  bin/buildout database=postgresql://myuser@myhost/dbname

To run::

  bin/app fg

(Use ``start`` rather than ``fg`` to run the server in the background.)

Visit ``http://localhost:8000/?email=test.example.com`` to log in.

