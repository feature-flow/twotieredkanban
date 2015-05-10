services = angular.module("kb.board", [])

class Task
  constructor: (@id, @name, @parent=null, @state="Ready") ->
    if not @parent?
      @tasks = {} # {state -> [task]}

  add_subtask: (task) ->
    if @tasks[task.state]?
      @tasks[task.state].push(task)
    else
      @tasks[task.state] = [task]

  move_subtask: (task, state) ->
    old_tasks = @tasks[task.state]
    index = old_tasks.indexOf(task)
    old_tasks[index .. index] = []
    task.state = state
    @tasks[state].push(task)

class Board
  constructor: (model, tasks...) ->
    @tasks = {}
    @states = []
    @states_by_name = {}
    for state in model
      if typeof(state) == "string"
        state =
          name: state
          label: state
      if not state.name?
        state.name = state.label
      state.projects = []
      @states.push(state)
      @states_by_name[state.name] = state

    @add_tasks(tasks)

  add_tasks: (tasks) ->
    for task in tasks
      old = @tasks[task.id]
      if old?
        old.update(task)
      else
        @tasks[task.id] = task
        if task.parent?
          parent = @tasks[task.parent]
          parent.add_subtask(task)
        else
          @states_by_name[task.state].projects.push(task)

  move_project: (project, state) ->
    old_projects = @states_by_name[project.state].projects
    index = old_projects.indexOf(project)
    old_projects[index .. index] = []
    project.state = state.name
    state.projects.push(project)


model = [
    "Backlog", "Ready"
  ,
    label: "Development"
    substates: ["Ready", "Doing", "NeedsReview", "Review", "Done"]
  ,
    "Acceptance", "Deploying", "Deployed"
  ]

board = new Board(
    model
    new Task("t1", "Build one")
    new Task("t11", "sit on it", "t1")
    new Task("t12", "get up", "t1")
    new Task("t2", "Walk the dog", null, "Development")
    new Task("t21", "put on leash", "t2", "Doing")
    new Task("t22", "walk", "t2")
    new Task("t3", "Garage")
    new Task("t31", "throw out junk", "t3")
    new Task("t32", "fix floor", "t3")
    )

services.factory("Board", () -> board)
