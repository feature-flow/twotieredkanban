==========
Valuenator
==========

Valuenator is a somewhat opinionated implementation of :doc:`feature
flow <index>`
that seeks to automate what's core and proscribing as little else as
practical.

Some important guiding principals:

The core ideas should be automated
  The hierarchical relationship between features and tasks is
  explicit.  Task boards are hierarchically displayed within the
  feature board when features enter a development state.

A teams activity should be readily visible
  It should be possible to see important information on who and what
  on a computer monitor without scrolling.

  The goal of this is to support stand-ups where people don't talk
  about what they're working on, because it's apparent on the board.

  Instead, the stand-up is a chance for address issues, like blocked
  work or pile-ups in the process, which should also be apparent on
  the board.

Teams should be self organizing
  Tasks aren't assigned up front by default.

  Rather as users pull tasks into working states, like doing or
  review, they automatically self assign.

Running Valuenator
==================

The easiest way to try Valuenator is with the `demo version
<http://valuenator.com/demo>`_.  This lets you try out the
application and get familiar with concepts very quickly without making
any commitments or signing up for anything.

We're working on an on-line web-based version of Valuenator.  We'll be
launching an on-line beta soon.

Valuenator is an `open-source project
<https://github.com/feature-flow/twotieredkanban>`_, which you can run
yourself, however, making this easy to do isn't a priority at this
time.  It's not very hard, but we're not putting effort into making it
easy at this time, and the software is evolving rapidly.

Using Valuenator
================

Using Valuenator amounts to creating and editing features and tasks
and moving them through states by dragging cards on boards.

Features start in the backlog, move through several states. When done,
features are dragged to "the bag", where they can be found later, if
needed.

Let's walk through the user interface, as shown in the screen shot
below:

.. image:: sample-board.png

Top bar
-------

At the top of the window is a bar that shows a menu icon on the left.
Clicking on this icon opens the navigation drawer, which lets you
navigate between boards.

To the right of the menu coon is the title of the current board.  On
the right of the bar is the avatar of the current user. Clicking on
the avatar displays a menu of user options, like logging out or
updating profile information.

The avatar comes from `Gravatar <https://en.gravatar.com/>`_. Anyone
can use Gravatar to associate an avatar image with their email.  If a
user's email hasn't been registered with Gravatar, a random silly
image is used.  The demo version of Valuenator has sample users with
``example.com`` email addresses so their avatars use silly images. If
you click on the avatar and select "Profile" from the menu, you can
change the email address to use an address registered with Gravatar,
and get a real user image.

To the left of the avatar are options for editing he board name and
for hiding the action bar, which is useful during stand-up meetings.

Feature and task boards
-----------------------

Below the top bar is the feature board.  Each column in the board
represents a feature state [#states_editable_eventually]_. Each
feature is shown as a card on the board.  You can drag a card with
your mouse to move it to a new state.

When a feature is in the development state, it's card contains a task
board, showing the tasks needed to implement the feature.  Tasks are
shown as cards on the task board and can be dragged between columns to
change their state.

A feature walk through
----------------------

Let's see how this works by walking through the feature-flow process.

#. Create a feature.

   Click on the "+", add button, below the backlog title.

   A dialog is  displayed where we can enter a feature title and description.
   Enter  a   title  like:  "Support  multiple   browsers".   Enter  a
   description, if you wish and click the "Add" button.

   A card for the feature is added to the backlog.  By default, the
   title is shown and some basic metrics are shown. The metrics, shown
   as 2 numbers in parentheses, are the total number of completed
   `points
   <https://www.mountaingoatsoftware.com/blog/what-are-story-points>`_
   and the total number of `points
   <https://www.mountaingoatsoftware.com/blog/what-are-story-points>`_
   in the feature.

   A reveal button to the the right can be clicked to show more
   information, including the feature description, tasks, and
   buttons for editing the feature and for adding tasks.

#. Add tasks

   Click on the reveal button of the feature you just added.  You'll
   see the description you entered, if any, and buttons for adding
   tasks (+) and for editing the feature (a pencil).

   Click on the add/+ button.  An add-task dialog is displayed.  In
   addition to a title and description, you can specify:

   Size
     The estimated size of the projects in `points
     <https://www.mountaingoatsoftware.com/blog/what-are-story-points>`_.
     This is usually just a rough estimate.

   Assigned
     You can use this to assign a task to a member of the team, but
     it's usually best to let team members self assign by dragging
     tasks into working columns.

   Blocked
     This is used to indicate a reason preventing the task from making
     progress.  This isn't usually set when adding a task. Don't use
     this to indicate dependence on other tasks, at least not
     initially.  Blocked tasks get special attention in stand-ups so
     unblocking them should be actionable.

   Enter a title, like "Safari".  Press enter.  This immediately adds
   the task.  The title is cleared so you can add another task.  A
   message is displayed briefly at the bottom of the window indicating
   that the task was added.  This allows a number of tasks to be added
   quickly.

   Now enter "Firefox [2]" and press enter.  This second task is
   added. The "[2]" in the title indicates that we estimate the task
   will be roughly twice as hard as the smallest task.  When a title
   ends in a number in square braces, the number is taken as the
   size.  This allows for sizes to be supplied in quick-entry mode.

   Enter "Edge [2]". Also enter "Need a computer with the Edge
   browser" in the blocked field. Click "Add and add another".

   Enter "Write a test script" and press enter.

   Press the escape key to cancel the form and stop entering tasks.
   Alternatively, you could have clicked the "Add" button to add the
   previous task.

   A common workflow might be to have `story times
   <http://smallwood-software.com/1/post/2011/10/story-time.html>`_
   [#times]_, after which someone does a work-break down to identify the
   tasks.

#. Now that tasks have been defined, we indicate that the feature is
   ready to be worked on by dragging it to the "Ready" column on the
   feature board.  The "Ready" column is orderable, so if there are
   multiple features, we can indicate the priority by dragging to
   different positions in the column.

   Normally we wouldn't do this if there was already a feature in the
   ready column. In fact, we might not bother with taking the time to
   elaborate features with story times or do work break-downs until
   the ready column is empty. Requirements and priorities can change
   very quickly and work can end up being wasted if it's done too
   soon.

   In this walk-through though, we'll take our example feature through
   the various states even though there are other features in them.

#. When we're ready to start working on the feature, we'll drag it to
   the development column on the feature board.

   When we do, we see all of the tasks are in the "Ready" task state.
   Imagine we have 2 developers. Drag the "Write a test script" and
   "Safari" tasks to the "Doing" column.  The tasks are automatically
   assigned to you and your avatar is shown on the tasks. The task
   colors switch to green as well to visually emphasize that they're in
   a working state.

   Note that when you dragged to "Doing", the whole column was
   highlighted. Non-waiting states, like "Doing", "Review" and "Done"
   aren't orderable. Dragging tasks to those states simply adds them
   to the top of the list of tasks in the state.

   If you'd wanted to make the exercise more more realistic, you could
   have switched users by clicking the avatar in the action bar,
   selecting "Switch user" and then selecting a different user to act
   as.  Of course, you could also just reassign one of the tasks. For
   example, if you click on the expand button for the Safari task and
   click the edit/pencil button, you can assign the task to someone
   else.

   In your stand-up meeting you'd note the blocked task because the task
   is shown with a pink color and shows the blocked reason.  You find
   a suitable computer for testing, and thus unblock the task.  Click
   on the expand button for the task and then the edit button.  Delete
   the text in the blocked field and save.  Now the task is shown in
   yellow, and is ready to be worked on.

   Drag tasks through the phases until all of the tasks are in the
   Done column.  Notice that as tasks are dragged to the "Done"
   column, the count of completed tasks increases.

   Finally, drag the feature to the "Acceptance" column. It's shrinks
   back down to a single card.

#. Drag the feature to the "Deploying" column and finally to the
   "Deployed" column.  After appreciating your accomplishment, drag
   to feature to "The Bag".  The feature is now "in the bag".

You can change your mind and break rules
----------------------------------------

While you'll usually drag tasks across boards state by state in one
direction, Valuenator doesn't enforce this. You can skip states. You
can drag tasks from one feature to another.  You can drag tasks to
feature columns, turning them into features.  You drag empty features
to task columns making them tasks.

Features don't have to be done to be moved to the Bag. The Bag is a
place to put features you don't want to think about any more. You may
for example decide that a feature is too hard not worth the effort and
drag it to the bag. (Bag it.)  If you change your mind later, you can
pull it back out of the bag.

Empty features
--------------

Sometimes features are very small and don't need to be broken into
multiple tasks.  If you drag an empty feature into development, a task
with an empty title will be created automatically for you. This is
useful for tracking progress through development states and seeing
assignments.  Of course, you can edit this task if you wish.

Working with the Bag
--------------------

The bag has a reveal button. If you click on it, the bag will expand
to show the most recently bagged features.  Over time, as you bag more
and more value, you'll have more than can be shown at once.
Arrow-buttons at the bottom of the bag let you scroll through
features. You can also search for features based on feature and task
title and description text.

Each feature is shown with title and metrics and has a reveal
button. Clicking on the reveal button for a feature shows its
description and tasks.  Also shown, at the bottom, is a button to restore
the feature from the bag. Clicking on this button restores the feature
to the state it was in before it was bagged.



.. [#states_editable_eventually] States will be editable eventually.
   This is a planned but so far unimplemented feature.  If this is
   important to you, send an email to feedback@valuenator.com, or
   comment on the `github issue
   <https://github.com/feature-flow/twotieredkanban/issues/26>`_.

.. [#times] It's common to iterate on stories and multiple meetings
   are often needed.
