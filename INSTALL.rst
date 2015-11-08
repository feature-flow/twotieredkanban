Installation
============

- Intall npm.

  On Mac::

     brew install npm

- install grunt.

  ::

     npm install -g grunt-cli

- Clone the repository.

- Change to the project directory.

- Edit buildout.cfg and update the following parameters in the
  buildout section:

  port
    The port you want to listen on

  url
    The URL the application will be served at, including the port, if
    not 80.

  authorized
    Whitespace separated list of regular expressions matching emails
    that should be allowed access.

- Run the bootstrap script with Python 2.6 or 2.7::

    python bootstrap.py

- Run the buildout::

    bin/buildout

  Note that you'll need development tools and libraries, including
  libevent.

- Run the server::

    bin/server start

- Run server tests:

    bin/test

- Run the JS unit tests with Karma:

    karma start test.js
