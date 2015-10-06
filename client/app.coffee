app = angular.module(
  'kb', [
    'kb.directives'
    'kb.login'
    'ui.router'
    ])

app.config(($stateProvider, $urlRouterProvider) ->
  $urlRouterProvider.otherwise("/")

  $stateProvider
  .state("Loading", {
    url: "/"
    controller: ($state, Server) ->
      Server.poll().then( -> $state.go("board"))
    template: "<md-content>Loading ...<md-content>"
    })
  .state("board", {
    url: "/board"
    template: "<kb-board></kb-board>"
    })
  )

