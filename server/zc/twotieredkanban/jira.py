import oauthlib.oauth1
import bobo
import persistent
import requests
import requests_oauthlib
import six.moves.urllib.parse

from jira import JIRA
from . import post, API

class Jira(persistent.Persistent):

    def client(self):
        return JIRA(
            self.server,
            oauth = dict(
                access_token        = self.access_token,
                access_token_secret = self.token_secret,
                consumer_key        = self.consumer_key,
                key_cert            = self.private_key,
                )
            )

@bobo.scan_class
class Routes:

    def __init__(self, api):
        self.api = api
        try:
            self.jira = api.kanban.jira
        except AttributeError:
            self.jira = api.kanban.jira = Jira()

    def check(self, func):
        return self.api.check(func)

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

def config(options):
    API.jira = bobo.subroute('/jira')(lambda self, request: Routes(self))
    bobo.scan_class(API)
