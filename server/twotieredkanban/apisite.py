import bobo

from .apiutil import Sync, post

@bobo.scan_class
class Site(Sync):

    @post('/boards', content_type="application/json")
    def post_board(self, name, title, description):
        if name in self.context.boards:
            self.base.error("A board with name %r already exists." % name)
        self.context.add_board(name, title, description)
        return self.response()
