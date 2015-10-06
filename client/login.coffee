module = angular.module("kb.login", ["kb.initial", "persona", "ui.router"])

module.config(($stateProvider) ->
  $stateProvider.state("login", {
    url: "/login"
    controller: ($scope, Persona) ->
      $scope.login = -> Persona.request()
    template: '
      <md-content>
        You need to login to use the two-tiered kanban board.<br>
        <md-button ng-click="login()">
          Login
        </md-button>
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

module.factory("kbUser", -> { email: '' })

module.run(($http, $state, $rootScope,
           Persona, kbUser, INITIAL_EMAIL, INITIAL_EMAIL_HASH) ->
  kbUser.email = INITIAL_EMAIL
  kbUser.email_hash = INITIAL_EMAIL_HASH
  $rootScope.$on("unauthenticated", -> $state.go("login"))
  Persona.watch(
    loggedInUser: kbUser.email
    onlogin: (assertion) ->
      $http.post('/login', {assertion: assertion}).then(
        (data) ->
          kbUser.email = data.data.email
          kbUser.email_hash = data.data.email_hash
          $state.go("board")
        (reason) ->
          alert(reason)
          $state.go("login")
        )
    onlogout: ->
      $http.post('/logout').then(
        (data) ->
          $state.go("login")
        (reason) ->
          alert(reason)
          $state.go("login")
        )
    )
  )
