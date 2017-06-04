========
Velocity
========

Velocity helps to make very rough estimate of how long projects will
take (or take to finish) based on the time taked for completed task
points in the past.

We can compute velocity in a number of ways over a number of time
periods.

- Project points are the total points of a project's tasks.

- Project *completed* points are the total points of a project's
  *completed* tasks.

- Project working time is the total time a project spends in working
  project states.

- **Project velocity** is the project completed points divided by the
  working time.

- Task working time is the total time a task spends in working
  task states.

- Project task working time is the total of the working times of its
  tasks.

- **Project task velocity** is the project completed points divided
  by the project task working time.

- For each of the project's working states, we can compute the
  state velocity as the project completed points divided by the time
  spent in that state.

- For given time intervals, such as a week or month, we can compute
  the velocity as the total number of completed points for the
  interval.  If tasks span intervals, their points will be prorated
  based on the amount of time the task was working in each interval.

-----------------------------------------------------------------------------

Implementation notes:

- A tasks state is the combination of it's state and it's project's
  state.  A project transition in or out of development causes
  transitions for the tasks.

- A project or task has a history, which is a reverse-chronological
  sequence of states.

- Each history item has:

  - start time
  - end time (null/None initially)
  - task or project id
  - state id
  - meta state: w (working), c (completed), or null/None
