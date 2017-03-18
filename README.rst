Two-tiered Kanban
=================

A two-tiered kanban models processes with nested subprocesses.  A
typical example is a product-develolpment process with a nested
software-development process.

.. image:: screenshot.png

Why two-tiered kanban?  The goal of a lean organization is to provide
value to its stakeholders.  The efforts of the organization must
remain focussed on providing value.  Typical kanban boards focus on
development, but products don't provide value until their in the hands
of customers.  In the case of software development, software doesn't
provide value until it's deployed to and being used by customers.
While in the development cycle, it's important to track the progress
of individual components, it's also critical to track the progress of
a product after development to get it in the hands of users as soon as
possible.  Two-tiered kanban allows us to track progress of individual
components during development and also allows us to track the full
lifecycle of a product or feature until it's in the hands of
customers.

The basic idea is that it's not enough to have a development Kanban
process. The process must also include higher-level activities, like
analysis, demo/acceptance testing and, most importantly,
deployment. Development provides no value until the resulting software
is used.

You can drag releases and tags around to represent progress. You can
also take tasks to work on and mark tasks as blocked.

Status and changes
==================

This version of the two-tiered Kanban board is still in **initial
development**.

There have been a number of obsticals and disruptions to development:

- This has been a side project for some time. Quite a bit of
  development was done on a commuter train.  There has been a lot of
  exploratory development and refactoring leaving things a bit unstable.

- The Persona service went away.  Persona was a 3rd-party
  authentication service provided by Mozilla.  It was very easy to
  use, especially because it didn't require applications using it to
  have public addresses, so it could be easily used with development
  servers.  The intent was always to provide support for other login
  services, but for now there's just a placeholder non-authentication
  facility.

- I lost quite a bit of time exploring deep Jira integration, but
  finally decided that the deep integration I was exploring wouldn't
  work, because Jira schemas are too poorly defined.

  Since then, I've come to the conclusion that Kanban tasks and issue
  tracker issues should be distinct.  They really have different
  concerns.  IMO, tasks (much like PRs) should be able to address
  issues and update issue states, but that's about it.

- ZODB 5 broke the monkey patch that allowed change notification the
  application depended on.  This will be added as a formal ZODB API
  soon, probably in Newt DB, which the kanban now uses, sooner.

This project is derived from an `earlier two-tiered kanban project
<https://bitbucket.org/zc/asanakanban>`_ that used Asana as a back
end.
