m = angular.module("kb.persona", ["ui.router"])

m.config((kbMenuProvider) ->
  kbMenuProvider.add('login', 'Login with Persona', (Persona) ->
    Persona.request()
    )
  )

m.service('Persona', ($window) ->
  watch: ->
    $window.navigator.id.watch.apply($window.navigator.id, arguments)
  request: ->
    $window.navigator.id.request.apply($window.navigator.id, arguments)
  logout: ->
    $window.navigator.id.logout.apply($window.navigator.id, arguments)
  )

m.run(($http, $state, $rootScope, Persona, kbUser) ->
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
