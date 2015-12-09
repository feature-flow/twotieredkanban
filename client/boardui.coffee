m = angular.module(
  "kb.boardui",
  ['kb.board', 'kb.login', 'kb.util', 'ngMdIcons', "ngMaterial", "ngSanitize",
   'ngAnimate'])

directive = (name, func) -> m.directive(name, func)

m.config(($stateProvider) ->
  $stateProvider.state("authenticated.boards",
    url: "/boards"
    template: "<kb-boards></kb-boards>",
    title: "Available Kanban Boards"
  )

  $stateProvider.state("authenticated.board",
    url: "/board/:name"
    template: '''<kb-board name="name"></kb-board>'''
    controller: ($scope, $stateParams, $state) ->
      $scope.name = $stateParams.name
  )
)

m.config(($stateProvider, $urlRouterProvider) ->
  $urlRouterProvider.otherwise("/boards")
  )

directive('kbBoards', ($http, kbDialog, kbUser) ->
  template: '''
    <md-list class="kb-boards">
      <md-subheader class="md-no-sticky">Select a board:</md-subheader>
      <md-list-item ng-repeat="board in boards | orderBy:name">
        <a ui-sref="authenticated.board({ name: board.name })">
          {{ board.name}} - {{ board.title}}</a>
      </md-list-item>
      <md-subheader class="md-no-sticky">
        <button ng-if="is_admin" ng-click="add($event)">
          <ng-md-icon icon="add">
        </button>
      </md-subheader>
    </md-list>
    ''',
  link: (scope) ->
    scope.boards = []
    scope.is_admin = kbUser.is_admin
    $http.get('/kb-boards').then((resp) ->
      scope.boards = resp.data.boards
    )
    scope.add = (event) ->
      data = { description: '' }
      kbDialog.show(
        template: '''
          <md-input-container>
            <label>Name</label>
            <input type="text" ng-model="data.name" required>
          </md-input-container>
          <md-input-container>
            <label>Title</label>
            <input type="text" ng-model="data.title" required>
          </md-input-container>
          <md-input-container>
            <label>Description</label>
            <textarea ng-model="data.description"></textarea>
          </md-input-container>
          '''
        targetEvent: event
        scope:
          title: "Add board"
          action: "Add"
          data: data
      ).then(() ->
        if data.name
          $http.post('/kb-admin/boards', data).then((resp) ->
            scope.boards = resp.data.boards
          )
      )
)

directive(
  'kbBoard',
  (Board, $mdDialog, Server, $state) ->
    restrict: "E"
    replace: true
    template: '''
      <div class="kb-board">
        <table>
          <tr><th ng-repeat="state in states.slice(1)">{{state.label}}</th></tr>
          <tr><td ng-repeat="state in states.slice(1)"
                  kb-project-column state="state">
          </td></tr>
        </table>

        <div class="backlog">
          <h4>{{ states[0].label }}</h4>
          <kb-project-column state="states[0]"></kb-project-column>
          <md-button ng-click="new_project($event)">
            Add project
          </md-button>
        </div>
      </div>
      '''
    scope: { name: '&'}
    link: (scope) ->
      Server.board(scope.name())
      scope.board = Board
      scope.states = Board.states

      scope.status = Server.status
      scope.try_now = -> Server.start_polling()

      $state.current.title = Board.title
      scope.$watch(
        () ->
          Board.title
        () ->
          $state.current.title = Board.title
        )

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
    )

directive("kbProjectColumn", () ->
  replace: true
  template: '''
    <td class="kb_project_column"">
      <div class="kb-column">
        <div ng-repeat="project in state.projects" class="kb-column-item">
          <kb-project-divider state="state" before="project">
          </kb-project-divider>
          <kb-project state="state" project="project"></kb-project>
        </div>
        <kb-project-divider state="state" class="kb-task-tail">
        </kb-project-divider>
      </div>
    </td>'''
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
        <div ng-repeat="task in tasks" class="kb-column-item">
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
