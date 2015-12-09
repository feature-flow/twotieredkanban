module = angular.module("kb.login", ["persona", "ui.router"])

module.config(($stateProvider) ->
  $stateProvider.state("login", {
    url: "/login"
    controller: ($scope, Persona) ->
      $scope.login = -> Persona.request()
    template: '
      <md-content class="kb-login">
        <md-toolbar>
          <div class="md-toolbar-tools">
            <h2>You need to login to use the two-tiered kanban board.</h2>
          </div>
        </md-toolbar>
        <div class="kb-login-buttons">
            <md-button ng-click="login()">
            Login with Persona
          </md-button>
        </div>
      </md-content>
    '
    })
  )

module.factory("kbAuthInterceptor", ($rootScope) ->
  response: (response) ->
    if response.status == 401
      $rootScope.$emit("unauthenticated")
    response
  )
module.config(($httpProvider) ->  
    $httpProvider.interceptors.push('kbAuthInterceptor')
    )

module.provider('kbUser', () ->
  user_data = {}
  {
    set: (data) ->
       user_data = data
    $get: () ->
       user_data
  }
)

module.run(($http, $state, $rootScope, Persona, kbUser) ->
  $rootScope.$on("unauthenticated", -> $state.go("login"))
  Persona.watch(
    loggedInUser: kbUser.email
    onlogin: (assertion) ->
      $http.post('/kb-persona/login', {assertion: assertion}).then(
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
    onlogout: ->
      $http.post('/kb-logout').then(
        (data) ->
          $state.go("login")
        (reason) ->
          alert(reason)
          $state.go("login")
        )
    )
  )
