m = angular.module("kb.login", ["ui.router"])

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

m.run(($http, $state, $rootScope, Persona, kbUser) ->
  $rootScope.$on("unauthenticated", -> $state.go("login"))
  )
