directives = angular.module(
  "kb.directives",
  ['kb.board', 'ngMdIcons', "ngMaterial", "ngSanitize"])

directives.directive('kbBoard', (Board, $mdDialog, Persona, Server, kbUser) ->
  restrict: "E"
  replace: true
  templateUrl: "kbBoard.html"
  link: (scope) ->

    scope.board = Board
    scope.email = kbUser.email
    scope.email_hash = kbUser.email_hash
    Server.poll()

    scope.logout = -> Persona.logout()

    scope.new_project = (event) ->
      $mdDialog.show(
        controller: (scope, Server, $mdDialog) ->
          scope.hide = -> $mdDialog.hide()
          scope.cancel = -> $mdDialog.cancel()
          scope.action_label = "Add"
          scope.submit = () ->
            Server.new_project(
              scope.project_name, scope.project_description or "")
            scope.hide()
        templateUrl: "kbEditProject.html"
        targetEvent: event
        )
  )

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
        if project.state != scope.state.id
          Server.move_task(project, scope.state)
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
    tasks = scope.project.tasks[scope.state.id]
    if not tasks?
      tasks = []
      scope.project.tasks[scope.state.id] = tasks
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

task_template = '
<md-card ng-click="edit_task($event)">
  {{task.name}} [{{task.size}}]
</md-card>'

directives.directive("kbTask", ($mdDialog) ->
  restrict: "E"
  replace: true
  template: task_template
  link: (scope, el) ->
    scope.edit_task = (event) -> edit_task($mdDialog, scope.task, event)
  )


directives.directive("kbDevTask", ($mdDialog) ->
  restrict: "E"
  replace: true
  templateUrl: "kbDevTask.html"
  link: (scope, el) ->
    el.bind("dragstart", (ev) ->
      ev.dataTransfer.setData("text/" + scope.project.id, ev.target.id)
      )

    scope.edit_task = (event) -> edit_task($mdDialog, scope.task, event)
  )

directives.filter('breakify', ->
  (text) -> text.replace("\n\n", "<br><br>")
  )
