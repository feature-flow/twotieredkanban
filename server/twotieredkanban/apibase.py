import bobo
import os
import webob

from .apisite import Site
from .apiboard import Board
from .apiutil import get

auth = None # plugpoint

@bobo.subroute("", scan=True)
class Base:

    user = None

    def __init__(self, request):
        self.request = request
        self.connection = connection = request.environ['zodb.connection']
        self.root = root = connection.root
        self.site = root.sites[''] # Future lookup sites by domain


    def check(self, func=None):
        user = auth.user(self)
        if user is None:
            return auth.login()
        self.user = user

    def error(self, status, body):
        self.connection.transaction_manager.abort()
        if isinstance(body, str):
            body = dict(error=body)
        raise bobo.BoboException(status, body, "application/json")

    @get("/")
    def index_html(self):
        with open(os.path.join(os.path.dirname(__file__), "kb.html")) as f:
            response = webob.Response(f.read())

        return response


    @bobo.subroute('/site')
    def admin_api(self, request):
        return Site(self, self.site)

    @bobo.subroute('/auth')
    def auth_api(self, request):
        return auth.Subroute(self, self.site)

    @bobo.subroute('/board/:board')
    def board(self, request, board):
        b = self.site.boards.get(board)
        if b:
            router = Board(self, b)
            router.check = self.check
            return router

        raise bobo.NotFound


def initialize(database):
    with database.transaction() as conn:
        if not hasattr(conn.root, 'secret'):
            from os import urandom
            conn.root.secret = urandom(24)
        if not hasattr(conn.root, 'sites'):
            from BTrees.OOBTree import BTree
            conn.root.sites = BTree()
            from .site import Site
            conn.root.sites[''] = Site()

    from .invalidate import patch_db
    patch_db(database)

def config(config):
    global auth
    auth = __import__(config['auth'], fromlist=['*'])
