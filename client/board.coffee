services = angular.module("kb.board", [])

class Task
  constructor: (@id, @name, @description, @state, @blocked, @created,
                @assigned, @size, @complete, @parent=null) ->
    if not @parent?
      @tasks = {null: []} # {state -> [task]}, null state is all
      @completed = 0
    if not @size
      @size = 0

  add_subtask: (task) ->
    if @tasks[task.state]?
      @tasks[task.state].push(task)
    else
      @tasks[task.state] = [task]
    @tasks[null].push(task)
    @update_project_size()

  update_project_size: ->
    @size = 0
    @completed = 0
    for task in @tasks[null]
      @size += task.size
      if task.complete?
        @completed += task.size


  move_subtask: (task, state) ->
    if state != task.state
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
    if @parent?
      @blocked = task.blocked
      @created = task.created
      @assigned = task.assigned
      @size = task.size
      @complete = task.complete
      @parent.move_subtask(this, task.state)
      @parent.update_project_size()

class Board

  constructor:  () ->
    @admins = []
    @users = []
    @generation = 0
    @tasks = {}
    @states = []
    @states_by_id = {}

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
        @states_by_id[task.state].projects.push(task)

  move_project: (project, state) ->
    state = @states_by_id[state]
    old_projects = @states_by_id[project.state].projects
    index = old_projects.indexOf(project)
    old_projects[index .. index] = []
    project.state = state.id
    state.projects.push(project)

  _resolve: ->

  apply_updates: (updates) ->
    @_resolve()
    @_resolve = ->

    if updates.kanban?
        @admins[..] = updates.kanban["admins"]
        @users[..]  = updates.kanban["users"]

    if updates.states?
      # TODO: only handling new states

      # top-level states
      for state in updates.states.adds
        if not state.parent?
          @states.push(state)
          @states_by_id[state.id] = state
          state.projects = []
          state.has_substates = false

      # substates
      for state in updates.states.adds
        if state.parent?
          parent = @states_by_id[state.parent]
          if not parent.substates?
            parent.substates = []
            parent.has_substates = true
          parent.substates.push(state)
          if not @default_substate?
            @default_substate = state.id

    if updates.tasks?
      # TODO: only handling new and updates

      # projects
      for task in updates.tasks.adds
        if not task.parent?
          project = new Task(
              task.id
              task.name
              task.description
              if task.state? then task.state else @states[0].id
              )
          @add_task(project)

      # tasks
      for task in updates.tasks.adds
        if task.parent?
          project = @tasks[task.parent]
          @add_task(
            new Task(
              task.id
              task.name
              task.description
              if task.state? then task.state else @default_substate
              task.blocked
              task.created
              task.assigned
              task.size
              task.complete
              project
              ))

    @generation = updates.generation

services.factory(
  "Board"
  ($q) ->
    board = new Board()
    board.ready = $q((resolve) -> board._resolve = resolve)
    board
  )

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

services.run((Server, $rootScope) ->
  Server.start_polling()
  document.addEventListener("visibilitychange", () ->
    if document.visibilityState == 'visible'
      $rootScope.$apply(Server.start_polling)
    else  
      Server.stop_polling()
    )
  )

services.factory("Server", ($http, $timeout, INITIAL_EMAIL, Board) ->

  class Poller
    constructor: () ->
      @active = true
      @status = 'starting'

    cancel: ->
      @active = false
      @status = 'canceled'

    wait: (waiting, retry) ->
      if @active
        if waiting > 0
          @status = "Failed: retrying in #{ Math.round(waiting) } seconds"
          $timeout(
            () => @wait(waiting-1, retry)
            Math.min(waiting*1000, 1000)
            )
        else
          @status = 'connecting'
          @poll("/poll", retry)

    poll: (url='/longpoll', retry=.5) ->
      $http.get(url).then(
        () =>
          if @active
            @status = 'connected'
            @poll()
        (resp) =>
          if @active
            @status = 'failed'
            retry *= 2 if retry < 33
            @wait((Math.random() + .5) * retry, retry)
        )

  poller = new Poller()

  {
    start_polling: ->
      poller.cancel()
      poller = new Poller()
      poller.poll('/poll')
    stop_polling: ->
      poller.cancel()
    status: ->
      poller.status
    is_admin: -> INITIAL_EMAIL in Board.admins
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

    new_task: (project, name, description) ->
      $http.post("/releases/" + project.id, {
        name: name
        description: description
        })
    update_task: (task, name, description, size, blocked) ->
      $http.put("/tasks/" + task.id, {
        name: name
        description: description
        size: size
        blocked: blocked
        })
    move_task: (task, state) ->
      $http.put("/move/#{ task.id }", { state: state.id })
    }
  )
