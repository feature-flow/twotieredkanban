import bobo
import os
import webob

from .apisite import Site
from .apiboard import Board
from .apiutil import get

@bobo.subroute("", scan=True)
class Base:

    user = None

    def __init__(self, request):
        self.request = request
        self.connection = connection = request.environ['zodb.connection']
        self.root = root = connection.root
        self.site = root.sites.get(request.domain)
        self.auth = self.site.auth


    def check(self, func=None):
        user = self.auth.user(self.request)
        if user is None:
            return self.auth.login(self.request)
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
        return self.auth.subroute(self)

    @bobo.subroute('/board/:board')
    def board(self, request, board):
        b = self.site.boards.get(board)
        if b:
            router = Board(self, b)
            router.check = self.check
            return router

        raise bobo.NotFound
