================================
Deploying Valuenator with Docker
================================

.. contents::


Docker image
============

Get the image:

- Use the jimfulton/valuenator image from the Docker Hub::

    docker pull jimfulton/valuenator

- build a docker image using the Dockerfile in the main repository directory::

    docker build .

Required services
=================

You'll need a Postgres database to hold the data.

You'll need to be able to send email. There's currently support or using an SMTP
server or `AWS Simple Email Service (SES) <https://aws.amazon.com/ses/>`_.

The valuenator process listens on port 8000, so you'll need to map
some host port to that container port.

Environment variables
=====================

You'll also need to supply some environment variables when you run the image:

DSN
  The `Postgres connection string
  <http://www.newtdb.org/en/latest/topics/connection-strings.html>`_
  for your Postgres database.

To send mail with SES:

SES
  From address (e.g. ``support@valuenator.com``).

  Note that currently, only instance-role-based authentication is
  supported, so you'll need to run Valuenator from an EC2
  instance with an instance role that is allowed to send mail through
  your SES instance.

To send mail with SMTP:

SMTP
  From address (e.g. ``support@valuenator.com``).

SMTP_HOST
  The host address of your SMTP server.

SMTP_PORT
  The TCP port your SMTP server listens on.

SMTP_USER and SMTP_PASSWORD (optional)
  If your SMTP server requires authentication, then these are the user
  name and password.

SMTP_TLS (optional)
  If this is supplied as a non-empty string, then TLS (Transport Layer
  Security) will be used to send email to the server over an encrypted
  connection.

You can be notified of errors using `Sentry <http://getsentry.io/>`_:

RAVEN
  A sentry DSN to be used for the server.

JSRAVEN
  A sentry DSN to be used for the client.

Bootstrapping
=============

You'll need to set up a site and bootstrap administrative user.  You
can define multiple sites.  When the server gets a request, it looks
up a site based on the request domain.

Users are added to a site by asking them to request access, by going
to the site and filling out a request form.  An administrative user
reviews and approves requests. An initial administrative user needs to
be defined to to get the process started.

To bootstrap a site and initial administrative user, run the image with
these extra environment variables:

DOMAIN
  The domain the site will be accessed at (e.g. ``localhost`` or
  ``kanban.example.com``)

TITLE
  The site title.

  This is included in set-password emails and should be descriptive
  enough that recipients think the emails are legitimate.

EMAIL
  The initial user's email address.

  An email will be sent to this address with a link to set their
  password.

NAME
  The name of the initial user.

BASE_URL (optional)
  The base URL to use in the set-password link.

  This defaults to ``HTTP://DOMAIN``.  If you're server listens on a
  non-standard port, or you use HTTPS (as you should in production),
  you might want to supply this. Otherwise, you'll need to edit the
  set-password, which is probably easier.

You'll also need to specify the DSN and email-related variables
specified above.

Examples
========

Bootstrap a (test) site that runs on localhost
----------------------------------------------

docker run -it \
       -e 'DSN=postgresql://myserver/kanban' \
       -e 'SMTP=support@example.com' \
       -e 'SMTP_HOST=email-smtp.us-east-1.amazonaws.com' \
       -e 'SMTP_PORT=587' \
       -e 'SMTP_USER=USER' \
       -e 'SMTP_PW=PW' \
       -e 'SMTP_TLS=T' \
       -e DOMAIN=localhost \
       -e EMAIL=me@eample.com \
       -e NAME=Me \
       -e 'TITLE=Test Site' \
       jimfulton/valuenator

Run the server, listening on port 8080
--------------------------------------

docker run -it \
       -e 'DSN=postgresql://myserver/kanban' \
       -e 'SMTP=support@example.com' \
       -e 'SMTP_HOST=email-smtp.us-east-1.amazonaws.com' \
       -e 'SMTP_PORT=587' \
       -e 'SMTP_USER=USER' \
       -e 'SMTP_PW=PW' \
       -e 'SMTP_TLS=T' \
       -p 8080:8000 \
       jimfulton/valuenator
