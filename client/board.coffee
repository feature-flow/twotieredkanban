services = angular.module("kb.board", [])

ar_remove = (list, element) -> list.splice(list.indexOf(element), 1)

cmp_order = (a, b) ->
   if a.order < b.order then -1 else if a.order > b.order then 1 else 0

class TaskContainer
  constructor: (@total_size = 0, @total_completed = 0, @count=0) ->
    @subtasks_by_state = {} # {state_id -> [task]

  subtasks: (state) ->
    if not @subtasks_by_state[state]?
      @subtasks_by_state[state] = []
    @subtasks_by_state[state]

  add_subtask: (task) ->
    subtasks = @subtasks(task.state)
    subtasks.push(task)
    subtasks = @subtasks()
    subtasks.push(task)
    @update_stats()

  remove_subtask: (task) ->
     ar_remove(@subtasks(task.state), task)
     ar_remove(@subtasks(), task)
     @update_stats()

  update_stats: () ->
    @total_completed = @total_size = @count = 0
    for task in @subtasks()
      @count += 1
      @total_size += task.size
      if task.complete then @total_completed += task.size

  sort: (state) ->
    @subtasks(state).sort(cmp_order)
    @subtasks().sort(cmp_order)

class Task extends TaskContainer
  constructor: (@id, @name, @description, @state, @order, @blocked, @created,
                @assigned, @size=0, @complete=false, @parent=null) ->
    super()

  update: (task) ->
    @name = task.name
    @description = task.description
    @blocked = task.blocked
    @created = task.created
    @assigned = task.assigned
    @size = task.size
    @complete = task.complete
    @parent = task.parent
    @state = task.state
    @order = task.order

class Board extends TaskContainer

  constructor:  (@name) ->
    super()
    @generation = 0
    @tasks = {} # {id -> task} for all tasks
    @states = [] # [top-level-state]
    @states_by_id = {} # {id -> top-level-state
    @all_tasks = []
    @title = @name

  add_task: (task) ->
    old = @tasks[task.id]
    add = sort = true
    if old?
      if task.parent != old.parent or task.state != old.state
        (if old.parent? then old.parent else this).remove_subtask(old)
      else
        add = false
        sort = task.order != old.order
          
      old.update(task)
      task = old
    else
      @tasks[task.id] = task
      @all_tasks.push(task)

    parent = if task.parent? then task.parent else this
    if add
      parent.add_subtask(task)
    else
      parent.update_stats()
    if sort
      parent.sort(task.state)

  apply_updates: (updates) ->
    if updates.kanban?
      if updates.kanban.title?
        @title = updates.kanban.title

    if updates.states?

      # top-level states
      for state in updates.states.adds
        if not state.parent?
          if @states_by_id[state.id]?
            angular.extend(@states_by_id[state.id], state)
          else
            @states.push(state)
            @states_by_id[state.id] = state
            state.projects = @subtasks(state.id)
            state.has_substates = false

      # substates
      for state in updates.states.adds
        if state.parent?
          if @states_by_id[state.id]?
            angular.extend(@states_by_id[state.id], state)
          else
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
              task.order
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
              task.order
              task.blocked
              task.created
              task.assigned
              task.size
              task.complete
              project
              ))

      @all_tasks.sort(cmp_order)

    @generation = updates.generation

  order: (before, front) ->
    r = Math.random()
    if before?
      i = @all_tasks.indexOf(before)
      if i == 0
        before.order - .5 - r
      else
        d = before.order - @all_tasks[i-1].order
        before.order - (r * .5 + .25) * d
    else
      if @all_tasks.length > 0
        if front
          @all_tasks[0].order - .5 - r
        else
          @all_tasks[-1..][0].order + .5 + r
      else
        0

services.factory("Board", () -> new Board())

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
  document.addEventListener("visibilitychange", () ->
    if document.visibilityState == 'visible'
      $rootScope.$apply(Server.start_polling)
    else  
      Server.stop_polling()
    )
  )

services.factory("Server", ($http, $timeout, Board) ->

  class Poller
    constructor: (@board_name) ->
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
          @poll("/board/#{ @board_name }/poll", retry)

    poll: (url='', retry=.5) ->
      if not url
        url = "/board/#{ @board_name }/longpoll"
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

  board_name = ''
  poller = new Poller(board_name)
  start_polling = ->
      poller.cancel()
      if board_name
        poller = new Poller(board_name)
        poller.poll("/board/#{ board_name }/poll")

  {
    board: (new_name) ->
      board_name = new_name
      Board.constructor(board_name)
      start_polling()
      
    start_polling: start_polling
    stop_polling: ->
      poller.cancel()
    status: ->
      poller.status
    new_project: (name, description, order) ->
      $http.post("/board/#{ board_name }/releases", {
        name: name
        description: description
        order: order
        })
    update_project: (project, name, description) ->
      $http.put("/board/#{ board_name }/releases/" + project.id, {
        name: name
        description: description
        })
    new_task: (project, name, description, order) ->
      $http.post("/board/#{ board_name }/releases/" + project.id, {
        name: name
        description: description
        order: order
        })
    update_task: (task, name, description, order, size, blocked) ->
      $http.put("/board/#{ board_name }/tasks/" + task.id, {
        name: name
        description: description
        size: size
        blocked: blocked
        })
    move_task: (task, parent, state, order) ->
      $http.put("/board/#{ board_name }/move/#{ task.id }"
                {
                  state: state.id
                  parent_id: if parent? then parent.id else null
                  order: order
                })
    }
  )
