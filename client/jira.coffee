m = angular.module('kb.jira', ['kb.frame'])

m.config(($stateProvider, kbMenuProvider) ->
  $stateProvider.state("authenticated.jira", {
    url: "/jira"
    template: "<kb-jira></kb-jira>"
    title: 'Jira integration'
    })

  kbMenuProvider.add("admin", "Jira integration", ($state) ->
    $state.go('authenticated.jira')
    )
  )

base_url = '/kb-admin/jira/'

m.directive('kbJira', ($http, kbDialog, $state, $sce) ->
  template: '''
    <md-content class="kb-jira kb-page">

      <div ng-hide=webhook>
        <h5>Set up webhooks to get Jira updates</h5>
        <p>You can have changes in Jira sent to your Kanban boards by
          configuring the Kanban to provide a webhook to Jira to get
          updates.
        </p>
        <md-button type=button ng-click="create_webhook($event)">
          Setup Webhook
        </md-button>
      </div>

      <div ng-show=webhook>
        <h5>Jira webhook</h5>
        <p>Your Jira webhook is:</p>
        <pre>{{ webhook }}</pre>
        <p>Configure Jira to use this webhook by selecting "System"
          from the settings menu, then selecting "Webhooks", and then
          adding or editing a webhook with the URL above.</p>
        <p>Only issue updates are currently understood by the Kanban.</p>
        <md-button type=button ng-click="remove_webhook($event)">
          Remove
        </md-button>
        <md-button type=button ng-click="create_webhook($event)">
          Re-create
        </md-button>
      </div>

      <div ng-hide=connected>
        <h5>Connect to Jira to poll for data and send changes</h5>
        <p>If you connect to Jira, you can pull Jira data into the Kanban.
          You can also update Jira with changes made in the Kanban.</p>
        <md-button type=button ng-click="connect($event)">
          Connect
        </md-button>
      </div>

      <div ng-show=connected>
        <h5>Poll Jira for changes</h5>
        <p>You\'ve connected your Kabban to Jira. You can poll for updates.</p>
        <md-button type=button ng-click="poll()">
          Poll
        </md-button>
        <md-button type=button ng-click="disconnect()">
          Disconnect
        </md-button>
      </div>

    </md-content>'''
  scope: {}
  link: (scope) ->

    $http.get(base_url).then((resp) ->
      scope.connected = resp.data.connected
      scope.webhook = resp.data.webhook
    )

    scope.create_webhook = () ->
      $http.post(base_url + 'create-webhook', {}).then((resp) ->
        scope.webhook = resp.data.webhook
      )
    scope.remove_webhook = () ->
      $http.post(base_url + 'remove-webhook', {}).then(() ->
        scope.webhook = null
      )
 
    scope.connect = (event) ->
      step2 = {}
      kbDialog.show(
        template: '''
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
            public key.</p>'''
        targetEvent: event
        scope:
          title: 'Step 1: Set up an application link in your Jira server.'
          action: 'Continue'
      ).then(() ->
        kbDialog.show(
          template: '''
            <md-input-container>
              <label>Jira server</label>
              <input type="text" ng-model="data.jira_server" required>
            </md-input-container>
            <md-input-container>
              <label>Consumer key from step 1</label>
              <input type="text" ng-model="data.consumer_key" required>
            </md-input-container>
            <md-input-container>
              <label>Private key (from key pair created in step 1)</label>
              <textarea ng-model="data.private_key" required></textarea>
            </md-input-container>'''
          targetEvent: event
          scope:
            data: step2
            title: 'Step 2, Authorize the Kanban to access Jira.'
            action: 'Continue'
        )
      ).then(() ->
        $http.post(base_url + 'step2', step2)
      ).then((resp) ->
        kbDialog.show(
          template: '''
              <md-input-container>
                <label>
                  In the box below, authorize the Kanban to access Jira on
                  your behalf.</label>
                <iframe src="{{ auth_url }}"></iframe>
              </md-input-container>

              <p>Did youy authorize the Kanban to access Jira?</p>'''
          targetEvent: event
          scope:
            auth_url: $sce.trustAsResourceUrl(resp.data.auth_url)
            action: 'Yes'
            cancel_action: 'No'
        )
    ).then(() ->
        $http.post(base_url + 'step3')
    ).then(() ->
       scope.connected = true
    )

    scope.disconnect = () ->
      $http.post(base_url + 'disconnect', {}).then(() ->
        scope.connected = false
      )
    scope.poll = () ->
      $http.get(base_url + 'poll').then(() ->
        scope.webhook = null
      )
)
