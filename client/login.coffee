m = angular.module("kb.login", ["ui.router", "kb.util"])

m.config(($stateProvider) ->
  $stateProvider.state("login", {
    url: "/login"
    controller: ($scope, kbMenu) ->
      $scope.menu = kbMenu.login
    template: '
      <md-content class="kb-login">
        <md-toolbar>
          <div class="md-toolbar-tools">
            <h2>You need to login to use the two-tiered kanban board.</h2>
          </div>
        </md-toolbar>
        <div class="kb-login-buttons" ng-repeat="label in menu.labels">
          <md-button ng-click="menu.use(label)">
            {{ label }}
          </md-button>
        </div>
      </md-content>
    '
    })
  )

m.factory("kbAuthInterceptor", ($rootScope) ->
  response: (response) ->
    if response.status == 401
      $rootScope.$emit("unauthenticated")
    response
  )

m.config(($httpProvider) ->
  $httpProvider.interceptors.push('kbAuthInterceptor')
  )

m.provider('kbUser', () ->
  user_data = {}
  {
    set: (data) ->
       user_data = data
    $get: () ->
       user_data
  }
)

m.config((kbMenuProvider) ->
  kbMenuProvider.add(
    'login'
    'Login with Email'
    ($http, kbDialog, kbUser, $state) ->
      data = {}
      kbDialog.show(
        template: '''
          <md-input-container>
            <label>Email</label>
            <input type="text" ng-model="data.email" required>
          </md-input-container>
          '''
        scope:
          title: "Enter your email address"
          action: "Login"
          data: data
      ).then(() ->
        if data.email
          $http.post('/placeholder-login', data).then(
            (resp) ->
              kbUser.email = resp.data.email
              kbUser.email_hash = resp.data.email_hash
              kbUser.is_admin = resp.data.is_admin
              if $state.current.name == 'login'
                $state.go("authenticated.boards")
            (reason) ->
              if typeof reason == 'object'
                reason = reason.error
              alert(reason)
              $state.go("login")
            )
          )
      )
  )

m.run(($http, $state, $rootScope, kbUser) ->
  $rootScope.$on("unauthenticated", ->
    $state.go("login"))
  )
