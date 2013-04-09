Two-tiered Kanban on Asana
==========================

A two-tiered kanban models processes with nested subprocesses.  A
typical example is a product-develolpment process with a nested
software-development process.

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

This application uses an Asana *project* to model a development team.
Top level *tasks* model *releases*. *Subtasks* model release tasks.

The basic idea is that it's not enough to have a development Kanban
process. The process must also include higher-level activities, like
analysis, demo/acceptance testing and, most importantly,
deployment. Development provides no value until the resulting software
is used.

In your Asana setup, you must define the tags: ``analysis``,
``devready`` (ready for development), ``development``, ``demo``,
``deploy``, ``deployed``, ``ready``, ``doing``, ``nr`` (needs review),
``review``, ``done``, and ``blocked``.  These represent the various
states on the board. *The tasks must be public to your users.*

You can drag releases and tags around to represent progress. You can
also take tasks to work on and mark tasks as blocked.

This is very much a work in progress:

- The UI will get prettier. :)

- We'll add more functionality, but it's not a goal to replace the
  Asana UI.

- It currently implements a specific workflow.  In the future, we'll
  probably generalize it to let you specify your own work states and
  singly nested processes.

- We have to make lots of requests to Asana, making startup fairly slow
  and making it impractical to poll for updates efficiently. Updates
  to the Asana APIs will likely allow us to greatly speed loads and
  provide live updates.


