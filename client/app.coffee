app = angular.module(
  'kb', [
    'kb.directives'
    'kb.login'
    'ui.router'
    'kb.board'
    ])

app.config(($stateProvider, $urlRouterProvider) ->
  $urlRouterProvider.otherwise("/")

  $stateProvider
  .state("Loading", {
    url: "/"
    controller: ($state, Board) -> Board.ready.then( -> $state.go("board"))
    template: "<md-content>Loading ...<md-content>"
    })
  .state("board", {
    url: "/board"
    template: "<kb-board></kb-board>"
    })
  )
