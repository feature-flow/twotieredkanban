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

To run, open ``demo/index.html`` in your browser. If the browser
generates a ``file`` url by following the symbolic link, edit the URL
to end in ``demo/index.html``.

Server mode
===========

To build, run the buildout. This will build the Python app, run npm,
and webpack.

To run::

  bin/app fg

(Use ``start`` rather than ``fg`` to run the server in the background.)

Visit ``http://localhost:8000/?email=test.example.com`` to log in.

