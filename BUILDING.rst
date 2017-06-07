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

Before accessing the Kanban for the first time, you will need to
invite a (bootstrap) user::

  bin/emailpw-bootstrap -bd db.cfg localhost jim@jimfulton.info 'Jim Fulton'

This will print an "email" message with a URL, which will look
something like::

  http://localhost:8000/auth/accept?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImppbUBqaW1mdWx0b24uaW5mbyJ9.iZRzDFb5-yKFQB0xJv1Pg5uicQG4hImOJiAe8ncJ9_o

Opem the URL in your browser.  That should present a page to set your
password and then log in.

