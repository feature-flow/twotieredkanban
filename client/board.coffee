services = angular.module("kb.board", [])

class Task

  constructor: (@id, @name, @description, @state, @blocked, @created,
                @assignee, @size, @parent=null) ->
    if not @parent?
      @tasks = {null: []} # {state -> [task]}, null state is all

  add_subtask: (task) ->
    if @tasks[task.state]?
      @tasks[task.state].push(task)
    else
      @tasks[task.state] = [task]
    @tasks[null].push(task)

  move_subtask: (task, state) ->
    old_tasks = @tasks[task.state]
    index = old_tasks.indexOf(task)
    old_tasks[index .. index] = []
    task.state = state
    @tasks[state].push(task)

  update: (task) ->
    @name = task.name
    @description = task.description
    @blocked = task.blocked
    @created = task.created
    @assignee = task.assignee

class Board

  constructor: (model) ->
    @admins = []
    @users = []
    @generation = 0
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

  add_task: (task) ->
    old = @tasks[task.id]
    if old?
      old.update(task)
    else
      @tasks[task.id] = task
      if task.parent?
        task.parent.add_subtask(task)
      else
        @states_by_name[task.state].projects.push(task)

  move_project: (project, state) ->
    old_projects = @states_by_name[project.state].projects
    index = old_projects.indexOf(project)
    old_projects[index .. index] = []
    project.state = state.name
    state.projects.push(project)

  apply_updates: (updates) ->
    for project_add in updates.adds
      if project_add.id == ""
        @admins[..] = project_add["admins"]
        @users[..] = project_add["users"]
      else
        # Add projects first
        for add in project_add.adds
          if add.id == project_add.id
            @add_task(
              new Task(
                project_add.id
                add.name
                add.description
                if add.state? then add.state else "Backlog"
                add.blocked
                add.created
                add.assignee
                add.size
                ))
    for project_add in updates.adds
      if project_add.id != ""
        # add any tasks
        project = @tasks[project_add.id]
        for add in project_add.adds
          if add.id != project_add.id
            project.add_subtask(
              new Task(
                add.id
                add.name
                add.description
                if add.state? then add.state else "Ready"
                add.blocked
                add.created
                add.assignee
                add.size
                project
                ))

    @generation = updates.generation
    


model = [
    "Backlog", "Ready"
  ,
    label: "Development"
    substates: ["Ready", "Doing", "NeedsReview", "Review", "Done"]
  ,
    "Acceptance", "Deploying", "Deployed"
  ]

board = new Board(model)

services.factory("Board", () -> board)

services.factory("kbInterceptor", (Board) ->
  header = "X-Generation"
  
  request: (config) ->
    config.headers[header] = Board.generation.toString()
    config

  response: (response) ->
    updates = response.data.updates
    if updates?
      Board.apply_updates(updates)

    response
  )

services.config(($httpProvider) ->  
    $httpProvider.interceptors.push('kbInterceptor')
    )

services.factory("Server", ($http) ->
  poll: -> $http.get("/poll")
  new_project: (name, descriotion) ->
    $http.post("/releases", {
      name: name
      description: description
      })
  update_project: (project, name, description) ->
    $http.put("/releases/" + project.id, {
      name: name
      description: description
      }) 
  new_task: (project, name, description) ->
    $http.post("/releases/" + project.id, {
      name: name
      description: description
      })
  update_task: (task) ->
    $http.put("/releases/" + task.parent.id + "/tasks/" + task.id, {
      name: task.name
      state: task.state
      }) 
  )

services.run((Server) -> Server.poll())
