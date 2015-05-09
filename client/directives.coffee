directives = angular.module("kb.directives", [])

directives.directive("kbProjectColumn", ->
  restrict: "E"
  replace: true
  templateUrl: "kbProjectColumn.html"
  link: (scope, el) ->
    el.bind("dragover", (ev) ->
      ev.preventDefault()
      false
      )
  )
directives.directive("kbExpandedColumn", ->
  restrict: "E"
  replace: true
  templateUrl: "kbExpandedColumn.html"
  link: (scope, el) ->
    el.bind("dragover", (ev) ->
      ev.preventDefault()
      false
      )
  )
directives.directive("kbProject", ->
  restrict: "E"
  replace: true
  templateUrl: "kbProject.html"
  )
directives.directive("kbExpandedProject", ->
  restrict: "E"
  replace: true
  templateUrl: "kbExpandedProject.html"
  )
directives.directive("kbTaskColumn", ->
  restrict: "A"
  replace: true
  templateUrl: "kbTaskColumn.html"
  link: (scope, el) ->
    scope.tasks = (task for own tid, task of scope.project.tasks[scope.state])
    over = (ev) ->
      ev?.preventDefault()
      false
    el.bind("dragover", (ev) ->
      ev?.preventDefault()
      false
      )
    el.bind("drop", (ev) ->
      ev.preventDefault()
      id = ev.dataTransfer.getData("text")
      task = scope.board.tasks[id]
      tasks = scope.project.tasks
      if task.state != scope.state
        index = tasks[task.state].indexOf(task)
        tasks[task.state][index .. index] = []
        task.state = scope.state
        tasks[task.state].push(task)
      )
  )
directives.directive("kbTask", ->
  restrict: "E"
  replace: true
  templateUrl: "kbTask.html"
  link: (scope, el) ->
    el.bind("dragstart", (ev) ->
      ev.dataTransfer.setData("text", ev.target.id)
      undefined
      )
  )
