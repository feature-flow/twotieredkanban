============
Feature flow
============

Feature flow is an agile practice that seeks to provide value as
quickly as possible by focusing teams on individual units of value,
called "features".  Ideally, a team works on one feature at a time
[#tcboo]_.

A feature remains a team focus until it's providing value. It's not
enough, for example, for software to be checked in with tests
passing. It must be in front of customers or otherwise providing
stakeholder value.

How it works
============

.. image:: sample-board.png
   :width: 40em

Feature flow uses a two-level board.  At the top level, is a feature
board, showing features in the product backlog and in in progress (or
ready). The feature board provides a high-level view so stakeholder
can see what's in progress and prioritize the backlog.

When a feature enters development, a task board is used for the
feature.  This is the low-level view.

At any point in time, there's feature board and 0 or more task boards,
however, there should usually be only one or two task boards.

Core concepts
=============

Board
  A board provides a place for a team to track their work.

Feature
  Features are units of value.

  We use the term *feature* rather than value to emphasize visibility.

  A feature will often encompass multiple stories, depending on the
  granularity of stories.  A feature should be as small as possible
  and still provide value [#cd]_.

Task
  Features are broken into tasks, so that work may be subdivided and
  that progress may be tracked.  Features *can* be small enough to have
  a single task.  That is a good thing, because it means that value
  can be recognized sooner, but typically features require multiple
  tasks.

  When a feature enters a development state, a task board for the
  feature is used, allowing the team to coordinate effort to
  drive the feature to completion.

How its implemented
===================

Feature flow can be implemented in a number of ways:

- You can implement feature flow with a feature board and a collection of task
  boards, either using a software tool or sticky-notes on physical boards.

- You can use a single board with big cards for features and sticky
  notes for tasks.  When a feature enters a development state, you can
  move the stickies between development task states.

- Possibly using a `tool that supports complex workflows
  <https://leankit.com/>`_.

- The :doc:`Valuenator <valuenator>` application.

  The Valuenator `open source application
  <https://github.com/feature-flow/twotieredkanban>`_ is an attempt to
  automate the practice in a simple and opinionated way.  There's a
  `demo version <http://valuenator.com/demo/#/board/sample>`_ you can
  try without installing or signing up for anything to get a feel for
  the mechanics of the practice.

However it's implemented, it's important that the implementation makes
it easy to see everything relevant to a team at once.  This is one
reason why we think that a more specialized and opinionated tool has
value.

How it fits in with other agile practices
=========================================

Like any other agile practice, feature-flow is a part of a larger
agile process that teams should tailor to their needs and experience
through a process of "inspect and adapt".  Just as software should be
built incrementally, so should you evolve your agile processes
incrementally.  Feature-flow is one part.

Feature-flow is an alternative to Scrum sprints. Rather than
organizing work into fixed time increments, feature-flow organizes
around units of value. Features play a similar role to sprints,
focusing a team on a shared goal and features are often similar in
size to sprints.

Organizing around value rather than time has a number of advantages:

- It focuses the team on what's important to stakeholders.

  This may, for example, focus a team on activities outside of
  traditional development, such as deployment or training, because the
  team is focused on achieving value, not just finishing promised work.

- It provides value as soon as possible, not just at sprint boundaries.

- Much less time is spent in sprint planning, because there aren't sprints.

- Team improvement can be considered at any time, rather than at
  sprint boundaries, because there's less emphasis on deadlines.

Feature flow isn't new. Feature flow can be seen as an instance of
`continuous flow
<https://sites.google.com/a/scrumplop.org/published-patterns/product-organization-pattern-language/development-team/swarming--one-piece-continuous-flow>`_,
in that there's team focus on individual backlog items.

Feature flow is based on two-tiered Kanban boards as described in the
book `Kanban, by David Anderson
<https://www.amazon.com/dp/B0057H2M70>`_ (and elsewhere).

Feature-flow can and should be used with other agile practices, as
part of a larger process.


.. [#tcboo] In practice, when a feature is nearing completion, there
   may not be enough work left to occupy the whole team, so the team
   may start another, however, the top priority of the team is getting
   the first task finished.

.. [#cd] In a continuous-deployment environment, you might deploy
   subsets of features, with subsets not user-visible. This can help
   to avoid large software changes, to mitigate the risk of breakage.
   It can be argued that this provides value, but it's value that's
   not really visible to stake holders.  Which isn't to say that
   feature-flow and continuous deployment can't be used together, but
   they represent different kinds of flow.
