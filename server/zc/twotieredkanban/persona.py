import bobo
import hashlib
import itsdangerous
import json
import requests
import webob

TOKEN = 'auth_token'

def config(data):
    global audience
    audience = data['audience']

@bobo.scan_class
class Persona(object):

    email = ''

    def __init__(self, request):
        self.request = request
        self.connection = connection = request.environ['zodb.connection']
        self.root = root = connection.root

        token = request.cookies.get(TOKEN)
        if token:
            try:
                self.email = root.serializer.loads(token)
            except itsdangerous.BadTimeSignature:
                pass # just don't log them in
        self.kanban = root.kanban


    @bobo.post('/login')
    def login(self, assertion):
        # Send the assertion to Mozilla's verifier service.
        data = {'assertion': assertion, 'audience': audience}
        resp = requests.post(
            'https://verifier.login.persona.org/verify', data=data, verify=True)

        # Did the verifier respond?
        if resp.ok:
            # Parse the response
            verification_data = json.loads(resp.content)

            # Check if the assertion was valid
            if verification_data['status'] == 'okay':
                email = verification_data['email']
                verification_data['email_hash'] = self.email_hash(email)
                response = webob.Response(
                    json.dumps(verification_data),
                    content_type="application/json",
                    )
                set_cookie(response, self.root, email)
                return response
            else:
                raise bobo.BoboException('403', verification_data['reason'])
        else:
            # Oops, something failed. Abort.
            raise ValueError("wtf")

    @bobo.post('/logout')
    def logout(self):
        response = webob.Response('bye')
        response.set_cookie(TOKEN, '')
        return response

    def email_hash(self, email):
        return hashlib.md5(email.strip().lower()).hexdigest()

def initialize_database(database):
    with database.transaction() as conn:
        if not hasattr(conn.root, 'serializer'):
            import random
            pop = range(32,127)
            secret = ''.join(
                map(chr, [random.choice(pop) for i in range(99)]))
            serializer = itsdangerous.URLSafeTimedSerializer(secret)
            conn.root.serializer = serializer

def set_cookie(jar, root, email):
    jar.set_cookie(TOKEN, root.serializer.dumps(email))
