import oauthlib.oauth1
import bobo
from BTrees.OOBTree import BTree
import os
import persistent
import requests
import requests_oauthlib
import six.moves.urllib.parse
import urllib.parse

from jira import JIRA
from . import model
from .apiutil import get, post

class Jira(persistent.Persistent):

    webhook_secret = access_token = None

    def client(self):
        try:
            return self._v_client
        except AttributeError:
            self._v_client = JIRA(
                self.server,
                oauth = dict(
                    access_token        = self.access_token,
                    access_token_secret = self.token_secret,
                    consumer_key        = self.consumer_key,
                    key_cert            = self.private_key,
                    )
                )
        return self._v_client

@bobo.scan_class
class Routes:

    def __init__(self, api):
        self.api = api
        try:
            self.jira = api.site.__jira
        except AttributeError:
            self.jira = api.site.__jira = Jira()

    def check(self, func):
        return self.api.check(func)

    @get('/', content_type="application/json")
    def get_status(self):
        return dict(webhook=self.webhook_url(),
                    connected=bool(self.jira.access_token),
                    )

    @post('/create-webhook', content_type="application/json")
    def create_webhook(self):
        self.jira.webhook_secret = urllib.parse.quote(os.urandom(9), safe='')
        return dict(webhook=self.webhook_url())


    @post('/remove-webhook', content_type="application/json")
    def remove_webhook(self):
        self.jira.webhook_secret = None
        return {}

    def webhook_url(self):
        secret = self.jira.webhook_secret
        if secret:
            return (self.api.request.url.rsplit('/', 1)[0] +
                    '/h/' + secret)
        else:
            return None

    @post('/h/:secret')
    def webhook(self, secret, issue=None):
        if (secret == self.jira.webhook_secret) and issue:
            project_key = issue['project']['key']
            board = self.api.site.boards.get('project_key')
            if board is None:
                board = model.Kanban(name, project.name)
                site.boards[name] = board
            try: jira = board.__jira
            except AttributeError: jira = board.__jira = BTree()

            issuetype = issue['fields']['issuetype']['name']
            if issuetype == 'Epic':
                self.proces_epic(board, jira, issue)
            elif issuetype not in non_tasks:
                self.proces_task(board, jira, issue)

    @post('/step2', content_type="application/json")
    def step2(self, jira_server, consumer_key, private_key):
        jira = self.jira
        jira.verify = jira_server.startswith('https')
        jira.server = jira_server
        jira.consumer_key = consumer_key
        jira.private_key = private_key

        # step 1: get request tokens
        oauth = requests_oauthlib.OAuth1(
            consumer_key,
            signature_method = oauthlib.oauth1.SIGNATURE_RSA,
            rsa_key = private_key,
            )
        r = requests.post(
            jira_server + '/plugins/servlet/oauth/request-token',
            verify=jira.verify,
            auth=oauth,
            )
        request = dict(six.moves.urllib.parse.parse_qsl(r.text))
        request_token = jira.request_token = request['oauth_token']
        jira.request_token_secret = request['oauth_token_secret']

        return dict(
            auth_url =
            '{}/plugins/servlet/oauth/authorize?oauth_token={}'.format(
                jira_server, request_token)
            )

    @post('/step3', content_type="application/json")
    def step3(self):
        # step 3: get access tokens for validated user
        jira = self.jira
        oauth = requests_oauthlib.OAuth1(
            jira.consumer_key,
            signature_method = oauthlib.oauth1.SIGNATURE_RSA,
            rsa_key = jira.private_key,
            resource_owner_key = jira.request_token,
            resource_owner_secret = jira.request_token_secret
            )
        r = requests.post(
            jira.server + '/plugins/servlet/oauth/access-token',
            verify = jira.verify,
            auth=oauth)
        access = dict(six.moves.urllib.parse.parse_qsl(r.text))
        jira.access_token = access['oauth_token']
        jira.token_secret = access['oauth_token_secret']

        return {}

    @post('/disconnect', content_type="application/json")
    def disconnect(self):
        self.jira.access_token = None
        return {}

    @get('/poll', content_type="application/json")
    def poll(self):
        client = self.jira.client()
        site = self.api.site
        for project in client.projects():
            name = project.key
            board = site.boards.get(name)
            if board is None:
                board = model.Kanban(name, project.name)
                site.boards[name] = board

            try: jira = board.__jira
            except AttributeError: jira = board.__jira = BTree()

            issues = { i.id: (i.raw, i.raw['fields']['issuetype']['name'])
                       for i in client.search_issues(issue_query % name) }
            for iid, (issue, issuetype) in issues.items():
                if issuetype == 'Epic':
                    self.process_epic(board, jira, issue)
            for iid, (issue, issuetype) in issues.items():
                if issuetype not in non_tasks:
                    self.process_task(board, jira, issue)
        return {}

    def process_epic(self, board, jira, issue):
        key = issue['key']
        task = jira.get(key)
        if task is None:
            task = self._new_task(board, jira, key)
        self._update_task(task, issue)

    def process_task(self, board, jira, issue):
        fields = issue['fields']
        epic_key = fields['customfield_10009'] or 'No epic'
        release = jira.get(epic_key)
        if release is None:
            release = self._new_task(board, jira, epic_key)

        key = issue['key']
        task = jira.get(key)
        if task is None:
            task = self._new_task(board, jira, key)
        self._update_task(task, issue)
        task.parent = release
        task.size = int(fields.get('customfield_10005') or 1)
        if fields['customfield_10003']:
            task.blocked = 'Flagged in Jira'
        else:
            task.blocked = None

        assignee = fields['assignee']
        if assignee:
            assignee = assignee['emailAddress']

    def _new_task(self, board, jira, key):
        task = model.Task(
            '?', max(t.order for t in board.tasks) + 1 if board.tasks else 0)
        board.tasks.add(task)
        task.__jira_key = key
        task.__jira_updates = []
        jira[key] = task
        return task

    def _update_task(self, task, issue):
        fields = issue['fields']
        task.name = fields['summary']
        task.description = fields['description'] or ''
        task.__jira_updates.append(issue)


issue_query = 'project=%s and resolution = "Unresolved"'
non_tasks = 'Epic', 'Sub-task'

def config(options):
    from .apiadmin import Admin
    Admin.jira = bobo.subroute('/jira')(lambda self, request: Routes(self))
    bobo.scan_class(Admin)
