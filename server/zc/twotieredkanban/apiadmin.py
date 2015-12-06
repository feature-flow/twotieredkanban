import bobo

from .apiutil import get, post, put
from . import model

@bobo.scan_class
class Admin:

    def __init__(self, base):
        self.base = base
        self.site = base.site
        self.request = base.request

    def check(self, func):
        base = self.base
        r = base.check(func)
        if r:
            return r
        if base.email not in base.site.admins:
            base.error(403, dict(error="You must be an adminstrator"))

    @get("/users", content_type="application/json")
    def get_users(self):
        return dict(users=self.site.users, admins=self.site.admins)

    @put("/users")
    def put_users(self, users, admins):
        self.site.update_users(users, admins)
        return 'OK'

    @post('/boards', content_type="application/json")
    def post_board(self, name, title, description):
        if name in self.site.boards:
            self.base.error("A board with name %r already exists." % name)
        self.site.boards[name] = model.Kanban(name, title, description)
        return dict(
            boards= [board.json_reduce()
                     for board in self.site.boards.values()
                     ]
            )

