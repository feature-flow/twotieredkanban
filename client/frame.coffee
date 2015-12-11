m = angular.module('kb.frame', [])

m.config(($stateProvider) ->
  $stateProvider.state("authenticated", {
    template: "<kb-frame></kb-frame>"
    title: "FRAME"
    })
)

m.directive('kbFrame', ($state, kbMenu, kbUser, Persona, Server) ->
  template: '''
      <md-content class="kb-board">

        <md-toolbar>
          <div class="md-toolbar-tools">
            <h2>{{ current.title }}
              <span ng-show="status() == 'failed'">
                ({{ status() }}
                <md-button class="md-raised kb-try-now" ng-click="try_now()">
                  Try now
                </md-button>)
              </span>
            </h2>
            <span flex></span>

            <md-menu md-position-mode="target-right target" >
              <md-button aria-label="Open menu" ng-click="$mdOpenMenu($event)">
                <div layout="row" class="centered-items">
                  <img
                     ng-src="http://www.gravatar.com/avatar/{{email_hash}}?s=20"
                     class="kb-avatar"
                     width="20"
                     height="20"
                     />
                  <span class="kb-avatar-email">{{email}}</span>
                </div>
              </md-button>
              <md-menu-content width="4" >
                <md-menu-item>
                  <md-button ng-click="logout()">Logout</md-button>
                </md-menu-item>
                <md-menu-item>
                  <md-button ng-click="boards()">Boards</md-button>
                </md-menu-item>
                <md-menu-item ng-show="is_admin"
                              ng-repeat="label in admin_menu.labels">
                  <md-button ng-click="admin_menu.use(label)">
                    {{ label }}
                  </md-button>
                </md-menu-item>
              </md-menu-content>
            </md-menu>
          </div>
        </md-toolbar>

        <div ui-view></div>
      </md-content>
    '''
  link: (scope) ->

    scope.current = $state.current
    scope.status = Server.status
    scope.email = kbUser.email
    scope.email_hash = kbUser.email_hash
    scope.is_admin = kbUser.is_admin

    scope.admin_menu = kbMenu.admin

    scope.logout = Persona.logout

    scope.boards = -> $state.go("authenticated.boards")
)
