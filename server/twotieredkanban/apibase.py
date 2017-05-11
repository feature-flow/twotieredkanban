import bobo
import os

from .apisite import Site
from .apiboard import Board

@bobo.subroute("", scan=True)
class Base:

    def __init__(self, request):
        self.request = request
        self.connection = connection = request.environ['zodb.connection']
        self.root = root = connection.root
        self.site = root.sites[''] # Future lookup sites by domain

    def error(self, status, body):
        self.connection.transaction_manager.abort()
        if isinstance(body, str):
            body = dict(error=body)
        raise bobo.BoboException(status, body, "application/json")

    @bobo.get("/")
    def index_html(self):
        with open(os.path.join(os.path.dirname(__file__), "kb.html")) as f:
            return f.read()

    @bobo.subroute('/site')
    def admin_api(self, request):
        return Site(self, self.site)

    @bobo.subroute('/board/:board')
    def board(self, request, board):
        b = self.site.boards.get(board)
        if b:
            return Board(self, b)
        raise bobo.NotFound

def initialize(database):
    with database.transaction() as conn:
        if not hasattr(conn.root, 'sites'):
            from BTrees.OOBTree import BTree
            conn.root.sites = BTree()
            from .site import Site
            conn.root.sites[''] = Site('test@example.com')

    from .invalidate import patch_db
    patch_db(database)
