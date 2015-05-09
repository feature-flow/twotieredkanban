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
    tasks = scope.project.tasks[scope.state]
    if not tasks?
      tasks = []
      scope.project.tasks[scope.state] = tasks
    scope.tasks = tasks

    el.bind("dragover", (ev) ->
      ev?.preventDefault()
      false
      )

    el.bind("drop", (ev) ->
      ev.preventDefault()
      id = ev.dataTransfer.getData("text")
      task = scope.board.tasks[id]
      if task.state != scope.state
        scope.$apply(->
          old_tasks = scope.project.tasks[task.state]
          index = old_tasks.indexOf(task)
          old_tasks[index .. index] = []
          task.state = scope.state
          tasks.push(task)
        )
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
