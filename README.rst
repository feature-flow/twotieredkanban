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

Changes
=======

This version of the two-tiered Kanban board is still in initial
development. It is derived from an `earlier two-tiered kanban project
<https://bitbucket.org/zc/asanakanban>`_ that used Asana as a back
end.
