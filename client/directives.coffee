directives = angular.module(
  "kb.directives",
  ['kb.board', 'kb.login', 'kb.users', 'ngMdIcons', "ngMaterial", "ngSanitize"])

directives.directive(
  'kbBoard',
  (Board, $mdDialog, Persona, Server, kbUser, kbUsers) ->
    restrict: "E"
    replace: true
    templateUrl: "kbBoard.html"
    link: (scope) ->

      scope.board = Board
      scope.email = kbUser.email
      scope.email_hash = kbUser.email_hash
      Board.ready.then( -> scope.is_admin = Server.is_admin())

      scope.logout = -> Persona.logout()

      scope.status = Server.status
      scope.try_now = -> Server.start_polling()

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

      scope.manage_users = kbUsers.manage
    )

directives.directive("kbProjectColumn", (Server) ->
  restrict: "A"
  replace: true
  template: '
    <td class="kb_project_column">
      <kb-project ng-repeat="project in projects"></kb-project>
    </div>'
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
  template: '
    <td class="kb_task_column"
        ng-class="{ kb_working: state.working, kb_complete: state.complete }"
        id="{{project.id}}_{{state.name}}"
        >
      <kb-dev-task ng-repeat="task in tasks"></kb-task>
    </td>'
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

directives.directive("kbTask", ($mdDialog) ->
  restrict: "E"
  replace: true
  template: '
    <md-card ng-click="edit_task($event)">
      {{task.name}} [{{task.size}}]
    </md-card>'
  link: (scope, el) ->
    scope.edit_task = (event) -> edit_task($mdDialog, scope.task, event)
  )


directives.directive("kbDevTask", ($mdDialog) ->
  restrict: "E"
  replace: true
  template: '
    <md-card id="{{task.id}}"
             class="kb-dev-task"
             draggable="true"
             ng-class="{kb_blocked: task.blocked}"
             ng-click="edit_task($event)"
             >{{task.name}} [{{task.size}}]
      <div ng-if="task.blocked" class="kb_blocked_reason">
        {{task.blocked}}
      </div>
    </md-card>'
  link: (scope, el) ->
    el.bind("dragstart", (ev) ->
      ev.dataTransfer.setData("text/" + scope.project.id, ev.target.id)
      )

    scope.edit_task = (event) -> edit_task($mdDialog, scope.task, event)
  )

directives.filter('breakify', ->
  (text) -> text.replace("\n\n", "<br><br>")
  )

directives.directive('kbReturn', () ->
  restrict: 'A'
  scope: { result: '=kbReturn', keydown: '=' }
  link: (scope) ->
    scope.keydown = (event) ->
      key = event.which or event.keyCode
      if key == 13
        scope.result(true)
      if key == 27
        scope.result(false)
  )

directives.factory('kbDialog', ($mdDialog, $injector) ->
  show: (props) ->
    $mdDialog.show(
      controller: ($scope, $mdDialog) ->
        for name, val of props.scope
          $scope[name] = val
        $scope.cancel = $mdDialog.cancel
        $scope.hide = $mdDialog.hide
        if props.controller?
          props.controller($scope)
      targetEvent: event
      template: """
        <md-dialog aria-label="{{ title }}">
          <md-dialog-content>#{ props.template }</md-dialog-content>
          <div class="md-actions" layout="row" layout-align="end center">
            <md-button ng-click="cancel()">
              Cancel
            </md-button>
            <md-button ng-click="submit()" ng-disabled="disabled">
              {{ action }}
            </md-button>
          </div>
        </md-dialog>
        """
      )
  )
