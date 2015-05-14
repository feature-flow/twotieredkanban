directives = angular.module(
  "kb.directives",
  ['ngMdIcons', "ngMaterial", "ngSanitize"])

directives.directive("kbProjectColumn", (Server) ->
  restrict: "A"
  replace: true
  templateUrl: "kbProjectColumn.html"
  link: (scope, el) ->

    projects = scope.state.projects
    scope.projects = projects

    drag_type = "text/project"

    el.bind("dragover", (ev) ->
      if drag_type in ev.dataTransfer.types
          ev.preventDefault()
          false
      else
          true
      )

    el.bind("drop", (ev) ->
      if drag_type in ev.dataTransfer.types
        ev.preventDefault()
        id = ev.dataTransfer.getData(drag_type)
        project = scope.board.tasks[id]
        if project.state != scope.state.name
          Server.move_project(project, scope.state)
      )

    )

edit_task = ($mdDialog, task, event) ->
  $mdDialog.show(
    controller: ($scope, Server, $mdDialog, task) ->
      $scope.hide = -> $mdDialog.hide()
      $scope.cancel = -> $mdDialog.cancel()
      $scope.task_name = task.name
      $scope.task_description = task.description
      $scope.task_size = task.size
      $scope.task_blocked = task.blocked
      $scope.submit = () ->
        Server.update_task(
          task
          $scope.task_name
          $scope.task_description or ""
          $scope.task_size
          $scope.task_blocked or ""
          )
        $scope.hide()

    locals:
      task: task
    templateUrl: "kbEditTask.html"
    targetEvent: event
    )


directives.directive("kbProject", ($mdDialog) ->
  restrict: "E"
  replace: true
  templateUrl: "kbProject.html"
  link: (scope, el) ->
    el.bind("dragstart", (ev) ->
      if not ev.dataTransfer.types.length
        ev.dataTransfer.setData("text/project", ev.target.id)
      )

    scope.project_expanded = false
    scope.expand = -> scope.project_expanded = true
    scope.unexpand = -> scope.project_expanded = false

    double_newlines = /\n\n/g
    scope.description = ->
      scope.project.description.replace(double_newlines, "<br>")

    scope.edit_project = (event) ->
      $mdDialog.show(
        controller: ($scope, Server, $mdDialog, project) ->
          $scope.hide = -> $mdDialog.hide()
          $scope.cancel = -> $mdDialog.cancel()
          $scope.project_name = project.name
          $scope.project_description = project.description
          $scope.action_label = "Apply"
          $scope.submit = () ->
            Server.update_project(
              project, $scope.project_name, $scope.project_description)
            $scope.hide()

        locals:
          project: scope.project
        templateUrl: "kbEditProject.html"
        targetEvent: event
        )

    scope.add_task = (event) ->
      $mdDialog.show(
        controller: ($scope, Server, $mdDialog, project) ->
          $scope.hide = -> $mdDialog.hide()
          $scope.cancel = -> $mdDialog.cancel()
          $scope.submit = () ->
            Server.new_task(project, $scope.task_name,
                            $scope.task_description or "")
            $scope.hide()
        locals:
          project: scope.project
        templateUrl: "kbNewTask.html"
        targetEvent: event
        )
  )

directives.directive("kbTaskColumn", (Server) ->
  restrict: "A"
  replace: true
  templateUrl: "kbTaskColumn.html"
  link: (scope, el) ->
    tasks = scope.project.tasks[scope.state.name]
    if not tasks?
      tasks = []
      scope.project.tasks[scope.state.name] = tasks
    scope.tasks = tasks

    drag_type = "text/" + scope.project.id

    el.bind("dragover", (ev) ->
      if drag_type in ev.dataTransfer.types
        ev.preventDefault()
        false
      else
        true
      )

    el.bind("drop", (ev) ->
      if drag_type in ev.dataTransfer.types
        ev.preventDefault()
        id = ev.dataTransfer.getData(drag_type)
        task = scope.board.tasks[id]
        if task.state != scope.state
          Server.move_task(task, scope.state)
      )
  )

directives.directive("kbTask", ($mdDialog) ->
  restrict: "E"
  replace: true
  templateUrl: "kbTask.html"
  link: (scope, el) ->
    el.bind("dragstart", (ev) ->
      ev.dataTransfer.setData("text/" + scope.project.id, ev.target.id)
      )

    scope.edit_task = (event) -> edit_task($mdDialog, scope.task, event)
  )

directives.filter('breakify', ->
  (text) -> text.replace("\n\n", "<br><br>")
  )
