==============
Change history
==============

0.8.1 (unreleased)
=====================

When adding or editing tasks, you can press the enter/return key in
the title field to save the task.

When adding or entering tasks, if the title ends with a number in
square braces, it will be used as the size when the task is saved.

When adding tasks, if enter is pressed in the title field to save the
new task, the dialog is redisplayed to add another task.  When you're
done adding tasks, you can press the escape key to cancel the form.

Pressing the escape key in dialogs is equivalent to clicking the
cancel button.

In dialogs with text input, automatically give the first text input focus.

Fixed: pressing the escape key didn't cancel dialogs.

0.8.0 (2017-06-25)
=====================

Boards can now be renamed.

When dragging an empty feature to exploded state, add an empty task.

When visiting invalid routes (e.g. incorrent board name), the user is
is redirected to the welcome screen.

Added tooltips for several icon buttons.

Fixed: "Unassigned" was an option for user switching in demo.

Fixed: Archived-feature didn't qualify search by board.

0.7.0 (2017-06-23)
=====================

Implemented "The Bag" to hold old (generally finished) features.

0.6.0 (2017-06-18)
=====================

Improved the display of features and tasks. Both now always have
reveal functionality, which, allows descriptions to be viewed without
editing.  For projects, this makes the (unexpanded) development view a
little cleaner.

0.5.1 (2017-06-17)
=====================

- Include release information in sentry data and show the client
  releas in the nav drawer.

0.5.0 (2017-06-17)
=====================

Intitial numbered release after major refactoring to use React, ES6,
Newt DB, and other modernizations, like webpack.
