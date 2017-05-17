import bobo
import jwt
import jwt.exceptions
import os
import webob

from .apisite import Site
from .apiboard import Board

TOKEN='auth_token'

@bobo.subroute("", scan=True)
class Base:

    email = None

    def __init__(self, request):
        self.request = request
        self.connection = connection = request.environ['zodb.connection']
        self.root = root = connection.root
        self.site = root.sites[''] # Future lookup sites by domain


    def check(self, func=None):
        token = self.request.cookies.get(TOKEN)
        if token:
            try:
                self.email = jwt.decode(token, self.root.secret,
                                   algorithms=['HS256'])['email']
            except jwt.exceptions.DecodeError:
                pass # just don't log them in

        if not self.email:
            self.error(401, "You must authenticate")

        if self.email not in self.site.users:
            self.error(403,
                       dict(error="You're not authorized to use this Kanban.",
                            bad_user=True),
                       )

    def error(self, status, body):
        self.connection.transaction_manager.abort()
        if isinstance(body, str):
            body = dict(error=body)
        raise bobo.BoboException(status, body, "application/json")

    @bobo.get("/")
    def index_html(self, email=None):
        if email:
            # Dev support and punt for now on authentication
            self.email = email

        self.check()

        if email:
            response = bobo.redirect('/')
            set_cookie(response, self.root, email)
        else:
            with open(os.path.join(os.path.dirname(__file__), "kb.html")) as f:
                response = webob.Response(f.read())

        return response


    @bobo.subroute('/site')
    def admin_api(self, request):
        return Site(self, self.site)

    @bobo.subroute('/board/:board')
    def board(self, request, board):
        b = self.site.boards.get(board)
        if b:
            router = Board(self, b)
            router.check = self.check
            return router

        raise bobo.NotFound


    @bobo.query('/logout')
    def logout(self):
        response = webob.Response('bye')
        response.set_cookie(TOKEN, '')
        return response


def set_cookie(jar, root, email):
    jar.set_cookie(
        TOKEN,
        jwt.encode(
            dict(email=email), root.secret, algorithm='HS256').decode('utf-8'),
        )

def initialize(database):
    with database.transaction() as conn:
        if not hasattr(conn.root, 'secret'):
            from os import urandom
            conn.root.secret = urandom(24)
        if not hasattr(conn.root, 'sites'):
            from BTrees.OOBTree import BTree
            conn.root.sites = BTree()
            from .site import Site
            conn.root.sites[''] = Site('test@example.com')

    from .invalidate import patch_db
    patch_db(database)
