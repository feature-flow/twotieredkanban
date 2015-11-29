m = angular.module('kb.jira', [])

m.config(($stateProvider, kbAdminFunctionsProvider) ->
  $stateProvider.state("jira", {
    url: "/jira"
    template: "<kb-jira></kb-jira>"
    })

  kbAdminFunctionsProvider.add("Jira integration", ($state) ->
    $state.go('jira')
    )
  )
 

m.directive('kbJira', ($http, kbDialog, $state, $sce) ->
  template: '
      <div class="kb-jira">
        <h2>Integrating Jira</h2>

        <h4>Step 1: Set up an application link in your Jira server.</h4>

        <p>To integrate with Jira, you will need to set up an application
          link in your Jira installation.</p>

        <p>Go to your Jira settings menu and select Applications, then
          Application links.  Enter a URL and click Create new link.  It
          doesn\'t matter what the URL is. It\'s not used, because you\'re
          going to create an incoming link.  This will fail slowly. When
          it does, click continue.  Eventually, it will come back with a
          form. Enter an application name and select "Create incoming
          link", then click continue.</p>

        <p>Enter a consumer key. You\'ll need this later.  This is a more
          or less arbitary identifier. The domain name of your Kanban
          works here.<p>

        <p>Enter the consumper name.  This is a descriptive name that
          will be shown to you later when it\'s time to approve
          access. Something like "Two-Tiered Kanban" would be good.</p>

        <p>Create a puplic/private key pair. Enter the full text of the
          public key.</p>

        <h4>Step 2, Authorize the Kanban to access Jira.</h4>

        <form novalidate>
          <md-input-container>
            <label>Jira server</label>
            <input type="text" ng-model="jira_server" required>
          </md-input-container>
          <md-input-container>
            <label>Consumer key from step 1</label>
            <input type="text" ng-model="consumer_key" required>
          </md-input-container>
          <md-input-container>
            <label>Private key (from key pair created in step 1)</label>
            <textarea ng-model="private_key" required></textarea>
          </md-input-container>

          <md-button ng-click="authorize()">Authorize</md-button>
        </form>
      </div>
      ',
  scope: {}
  link: (scope) ->
    scope.authorize = (event) ->
      $http.post('/jira/step2', {
        jira_server: scope.jira_server
        consumer_key: scope.consumer_key
        private_key: scope.private_key
        }
      )
      .then((resp) ->
        kbDialog.show(
          template: '
              <md-input-container>
                <label>
                  In the box below, authorize the Kanban to access Jira on
                  your behalf.</label>
                <iframe src="{{ auth_url }}"></iframe>
              </md-input-container>

              <p>Did youy authorize the Kanban to access Jira?</p>'
          targetEvent: event
          scope:
            auth_url: $sce.trustAsResourceUrl(resp.data.auth_url)
            action: 'Yes'
            cancel_action: 'No'
        )
      )
      .then(
        () -> $http.post('/jira/step3')
      )
      .then(
        () -> $state.go('board')
        () -> $state.go('board')
      )
  )
