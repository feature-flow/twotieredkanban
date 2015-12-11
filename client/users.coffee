m = angular.module('kb.users', ['kb.board', 'kb.util'])

m.config((kbMenuProvider) ->
  kbMenuProvider.add("admin", "Manage users", (Board, $http, kbDialog) ->
    kbDialog.show(
      scope:
        title: 'Users'
        action: 'Update'
        users:
          admins: Board.admins
          users: Board.users
        disabled: true
      template: '<kb-users ng-model="users" ng-change="changed()"></kb-users>'
      controller: ($scope) ->
        $scope.changed = () -> $scope.disabled = false
        $scope.submit = () ->
           $http.put('/', $scope.users).then(() -> $scope.hide())
      )
    )
  )

m.directive('kbUsers', (Board, $mdDialog) ->
  restrict: 'E'
  replace: true
  require: 'ngModel'
  scope: {}
  template: '''
    <div class="user-table">
      <h4>Users</h4>
      <table>
        <tr ng-repeat="user in users">
          <td>{{ user.email }}</td>
          <td>
            <md-checkbox ng-model="user.admin"
                         ng-change="changed()"
                         aria-label="Admin"
                        >
              {{ user.admin ? 'Admin' : '' }}
            </md-checkbox>
          </td>
        </tr>
      </table>
      <md-button class="md-icon-button" aria-label="Add user" ng-click="add()">
        <ng-md-icon icon="person_add"></md-icon>
      </md-button>
      <md-input-container ng-show="adding">
        <label>Email</label>
        <input ng-model="email" type="email" ng-keydown="keydown($event)"
              kb-return="done_adding" keydown=keydown>
      </md-input-container>
    <div>
    '''
  link: (scope, e, a, model) ->
    model.$render = () ->
      users = ([email, true] for email in model.$viewValue.admins).concat(
        ([email, false] for email in model.$viewValue.users when (
          email not in model.$viewValue.admins)
        ))
      users.sort()
      scope.users = ({email: user[0], admin: user[1]} for user in users)

    scope.changed = () ->
      users =
        admins: (u.email for u in scope.users when u.admin)
        users: (u.email for u in scope.users)
      model.$setViewValue(users, 'users')

    scope.add = (event) ->
      scope.email = ''
      scope.adding = true

    scope.done_adding = (add) ->
      scope.adding = false
      if add and scope.email
        scope.users.push({ email: scope.email, admin: false })
        scope.changed()
    )
