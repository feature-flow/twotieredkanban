import bobo
import json
import os
import re
import requests
import zc.wsgisessions.sessions
import zope.component

url = 'http://localhost:8080'
authorized = None

def config(config):
    if 'url' in config:
        global url
        url = config.get('url')

    zope.component.provideAdapter(zc.wsgisessions.sessions.get_session)

    global authorized
    authorized = []
    for s in config['authorized'].strip().split():
        authorized.append(re.compile(s).search)

def db_init(database):
    zc.wsgisessions.sessions.initialize_database(database, db_name='')

def checker(inst, request, func):
    email = zc.wsgisessions.sessions.get(request, __name__, 'email')
    if not email:
        return bobo.redirect("/login.html")

def who(request):
    email = zc.wsgisessions.sessions.get(request, __name__, 'email')
    if email:
        return email.split('@')[0]


@bobo.query('/login.html')
def login_html():
    with open(os.path.join(os.path.dirname(__file__), 'login.html')) as f:
        return f.read()

@bobo.query('/login.js', content_type="application/javascript")
def login_js(bobo_request):
    email = zc.wsgisessions.sessions.get(bobo_request, __name__, 'email')
    with open(os.path.join(os.path.dirname(__file__), 'login.js')) as f:
        return f.read() % dict(
            url=url,
            email = repr(str(email)) if email else 'null'
            )


@bobo.post('/login')
def login(bobo_request, assertion):

    # Send the assertion to Mozilla's verifier service.
    data = {'assertion': assertion, 'audience': url}
    resp = requests.post(
        'https://verifier.login.persona.org/verify', data=data, verify=True)

    # Did the verifier respond?
    if resp.ok:
        # Parse the response
        verification_data = json.loads(resp.content)

        # Check if the assertion was valid
        if verification_data['status'] == 'okay':
            email = verification_data['email']
            for s in authorized:
                if s(email):
                    break
            else:
                raise bobo.BoboException(
                    '403', "You are not authorized at access this site.")

            zc.wsgisessions.sessions.store(
                bobo_request, __name__, 'email', email)
            return 'ok'
        else:
            raise bobo.BoboException('403', verification_data['reason'])
    else:
        # Oops, something failed. Abort.
        raise ValueError("wtf")

@bobo.post('/logout')
def logout(bobo_request):
    zc.wsgisessions.sessions.remove(bobo_request, __name__, 'email')
    return 'ok'
