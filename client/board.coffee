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
    if not @tasks[state]
      @tasks[state] = []
    @tasks[state].push(task)

  update: (task) ->
    @name = task.name
    @description = task.description
    @blocked = task.blocked
    @created = task.created
    @assignee = task.assignee
    @size = task.size
    @completed = task.completed

    if @parent? and task.state != @state
      @parent.move_subtask(this, task.state)

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
        state = { label: state }
      if not state.name?
        state.name = state.label.toLowerCase().replace(" ", "_")
      state.projects = []
      state.has_substates = state.substates?
      if state.substates?
        substates = []
        for substate in state.substates
          substates.push(
            label: substate
            name: substate.toLowerCase().replace(" ", "_")
            )
        state.substates = substates
      @states.push(state)
      @states_by_name[state.name] = state

  add_task: (task) ->
    old = @tasks[task.id]
    if old?
      old.update(task)
      if task.state != old.state
        if old.parent?
          old.parent.move_subtask(old, task.state)
        else
          @move_project(old, task.state)
    else
      @tasks[task.id] = task
      if task.parent?
        task.parent.add_subtask(task)
      else
        @states_by_name[task.state].projects.push(task)

  move_project: (project, state) ->
    state = @states_by_name[state]
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
            project = new Task(
              project_add.id
              add.name
              add.description
              if add.state? then add.state else "backlog"
              add.blocked
              add.created
              add.assignee
              add.size
              ) 
            project.completed = add.completed
            @add_task(project)

    # add any tasks
    for project_add in updates.adds
      if project_add.id != ""
        project = @tasks[project_add.id]
        for add in project_add.adds
          if add.id != project_add.id
            @add_task(
              new Task(
                add.id
                add.name
                add.description
                if add.state? then add.state else "ready"
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
    substates: ["Ready", "Doing", "Needs Review", "Review", "Done"]
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
  new_project: (name, description) ->
    $http.post("/releases", {
      name: name
      description: description
      })
  update_project: (project, name, description) ->
    $http.put("/releases/" + project.id, {
      name: name
      description: description
      })
  move_project: (project, state) ->
    $http.put("/move", {
      release_ids: [project.id] # XXX update server api to take 1
      state: state.name
      })
    
  new_task: (project, name, description) ->
    $http.post("/releases/" + project.id, {
      name: name
      description: description
      })
  update_task: (task, name, description, size, blocked) ->
    $http.put("/releases/" + task.parent.id + "/tasks/" + task.id, {
      name: name
      description: description
      size: size
      blocked: blocked
      }) 
  move_task: (task, state) ->
    $http.put("/releases/#{ task.parent.id }/move", {
      task_ids: [task.id] # XXX update server api to take 1
      state: state.name
      })
  )
