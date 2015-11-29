app = angular.module(
  'kb', [
    'kb.boardui'
    'kb.login'
    'kb.initial'
    'ui.router'
    'kb.board'
    'kb.users'
    'kb.jira'
    ])

app.config(($stateProvider, $urlRouterProvider) ->
  $urlRouterProvider.otherwise("/")
  )
