directives = angular.module(
  "kb.directives",
  ['kb.board', 'kb.login', 'kb.users', 'ngMdIcons', "ngMaterial", "ngSanitize"])

directive = (name, func) -> directives.directive(name, func)

directive(
  'kbBoard',
  (Board, $mdDialog, Persona, Server, kbUser, kbUsers) ->
    restrict: "E"
    replace: true
    templateUrl: "kbBoard.html"
    scope: {}
    link: (scope) ->

      scope.board = Board
      scope.states = Board.states
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
                scope.project_name
                scope.project_description or ""
                Board.order(undefined, true)
                )
              scope.hide()
          templateUrl: "kbEditProject.html"
          targetEvent: event
          )

      scope.manage_users = kbUsers.manage
    )

directive("kbProjectColumn", () ->
  replace: true
  template: '
    <td class="kb_project_column"">
      <div class="kb-column">
        <div ng-repeat="project in state.projects">
          <kb-project-divider state="state" before="project">
          </kb-project-divider>
          <kb-project state="state" project="project"></kb-project>
        </div>
        <kb-project-divider state="state" class="kb-task-tail">
        </kb-project-divider>
      </div>
    </td>'
  scope: { state: '=' }
  link: (scope, el) ->
  )

directive('kbProjectDivider', (Board, Server) ->
  replace: true
  template: '<div class="kb-task-divider"></div>'
  scope: { state: '=', before: '=?' }
  link: (scope, el) ->

    el.on('dragenter', (ev) -> el.addClass('dragover'))
    el.on('dragleave', (ev) -> el.removeClass('dragover'))

    el.bind("dragover", (ev) ->
      ev.preventDefault()
      false
      )

    el.bind("drop", (ev) ->
      ev.preventDefault()
      el.removeClass('dragover')
      id = ev.dataTransfer.getData('text/task')
      project = Board.tasks[id]
      Server.move_task(
        project, undefined, scope.state, Board.order(scope.before))
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

directive("kbProject", ($mdDialog, Board) ->
  restrict: "E"
  replace: true
  templateUrl: "kbProject.html"
  scope: { state: '=', project: '=' }
  link: (scope, el) ->

    el.bind("dragstart", (ev) ->
      if not ev.dataTransfer.types.length
        if scope.project.count > 0
          ev.dataTransfer.setData("text/project", true)
        ev.dataTransfer.setData("text/task", ev.target.id)
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
            Server.new_task(
              project
              $scope.task_name
              $scope.task_description or ""
              Board.order()
              )
            $scope.hide()
        locals:
          project: scope.project
        templateUrl: "kbNewTask.html"
        targetEvent: event
        )
  )

directive("kbTaskColumn", () ->
  replace: true
  template: '
    <td class="kb_task_column"
        ng-class="{ kb_working: state.working, kb_complete: state.complete }"
        id="{{project.id}}_{{state.name}}"
        >
      <div class="kb-column">
        <div ng-repeat="task in tasks">
          <kb-task-divider state="state" project="project" before="task">
          </kb-task-divider>
          <kb-dev-task task="task"></kb-dev-task>
        </div>
        <kb-task-divider state="state" project="project" class="kb-task-tail">
        </kb-task-divider>
    </td>'
  scope: { state: '=', project: '=' }
  link: (scope, el) ->
    scope.tasks = scope.project.subtasks(scope.state.id)
  )

directive('kbTaskDivider', (Server, Board) ->
  replace: true
  template: '<div class="kb-task-divider"></div>'
  scope: { state: '=', project: '=', before: '=?' }
  link: (scope, el) ->
    scope.tasks = scope.project.subtasks(scope.state.id)

    droppable = (ev) -> 'text/project' not in ev.dataTransfer.types
    el.on('dragenter', (ev) ->
      if droppable(ev)
       el.addClass('dragover'))
    el.on('dragleave', (ev) -> el.removeClass('dragover'))

    el.bind("dragover", (ev) ->
      if droppable(ev)
        ev.preventDefault()
        false
      else
        true
      )

    el.bind("drop", (ev) ->
      if droppable(ev)
        ev.preventDefault()
        el.removeClass('dragover')
        id = ev.dataTransfer.getData('text/task')
        task = Board.tasks[id]
        if task.state != scope.state or task.parent != scope.project
          Server.move_task(
            task, scope.project, scope.state, Board.order(scope.before))
      )
  )


directive("kbTask", ($mdDialog) ->
  replace: true
  scope: { task: '=' }
  template: '
    <md-card ng-click="edit_task($event)">
      {{task.name}} [{{task.size}}]
    </md-card>'
  link: (scope, el) ->
    scope.edit_task = (event) -> edit_task($mdDialog, scope.task, event)
  )


directive("kbDevTask", ($mdDialog) ->
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
  scope: { task: '=' }
  link: (scope, el) ->
    el.bind("dragstart", (ev) ->
      ev.dataTransfer.setData("text/task", ev.target.id)
      )

    scope.edit_task = (event) -> edit_task($mdDialog, scope.task, event)
  )

directives.filter('breakify', ->
  (text) -> text.replace("\n\n", "<br><br>")
  )

directive('kbReturn', () ->
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
