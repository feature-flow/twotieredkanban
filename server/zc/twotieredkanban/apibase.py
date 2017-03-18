import bobo
import hashlib
import json
import jwt.exceptions
import logging
import os
import webob

from .apiutil import get
from .apiadmin import Admin
from .apiboard import Board

TOKEN='auth_token'

logger = logging.getLogger(__name__)

@bobo.subroute("", scan=True)
class Base:

    email = ''

    def __init__(self, request):
        self.request = request
        self.connection = connection = request.environ['zodb.connection']
        self.root = root = connection.root
        self.site = root.sites[''] # Future lookup sites by domain

        token = request.cookies.get(TOKEN)
        if token:
            try:
                self.email = jwt.decode(token, root.secret,
                                        algorithms=['HS256'])['email']
            except jwt.exceptions.DecodeError:
                pass # just don't log them in

    def error(self, status, body):
        self.connection.transaction_manager.abort()
        if isinstance(body, str):
            body = dict(error=body)
        raise bobo.BoboException(status, body, "application/json")

    def check(self, func):
        if not self.email:
            self.error(401, "You must authenticate")
        if self.email not in self.site.users:
            self.error(403,
                       dict(error="You're not authorized to use this Kanban.",
                            bad_user=True),
                       )

    @bobo.get("/")
    def index_html(self):
        with open(os.path.join(os.path.dirname(__file__), "kb.html")) as f:
            return f.read() % (json.dumps(dict(
                email = self.email,
                email_hash = email_hash(self.email),
                is_admin = self.email in self.site.admins,
                )), )

    @bobo.subroute('/kb-admin')
    def admin_api(self, request):
        return Admin(self)

    @get('/kb-boards', content_type="application/json")
    def get_boards(self):
        return dict(
            boards= [board.json_reduce()
                     for board in self.site.boards.values()
                     ]
            )

    @bobo.post('/kb-logout')
    def logout(self):
        response = webob.Response('bye')
        response.set_cookie(TOKEN, '')
        return response

    @bobo.subroute('/board/:board')
    def board(self, request, board):
        b = self.site.boards.get(board)
        if b:
            return Board(self, b, self.connection)
        raise bobo.NotFound

    @bobo.post('/placeholder-login')
    def login(self, email):
        response = webob.Response(
            json.dumps(dict(
                email = email,
                email_hash = email_hash(email),
                is_admin = email in self.site.admins,
                )),
            content_type="application/json",
            )
        set_cookie(response, self.root, email)
        return response

def set_cookie(jar, root, email):
    jar.set_cookie(
        TOKEN,
        jwt.encode(
            dict(email=email), root.secret, algorithm='HS256').decode('utf-8'),
        )

def config(options):
    global COOKIE
    COOKIE = options.get('cookie', 'auth_token')

def initialize_database(initial_email):
    def initialize(database):
        with database.transaction() as conn:
            if not hasattr(conn.root, 'secret'):
                from os import urandom
                conn.root.secret = urandom(24)
            if not hasattr(conn.root, 'sites'):
                from BTrees.OOBTree import BTree
                conn.root.sites = BTree()
                from .site import Site
                conn.root.sites[''] = Site(initial_email)

        from .invalidate import patch_db
        patch_db(database)

    return initialize

def email_hash(email):
    return hashlib.md5(email.strip().lower().encode('utf-8')).hexdigest()
