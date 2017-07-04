import BTrees.OOBTree
import persistent
import zc.generationalset
from ZODB.utils import u64

from .board import Board

def get_site(root, name, title=None):
    try:
        sites = root.sites
    except AttributeError:
        if title:
            sites = root.sites = BTrees.OOBTree.BTree()
        else:
            raise

    try:
        return sites[name]
    except KeyError:
        if title:
            sites[name] = Site(title)
            return sites[name]
        else:
            raise

class Site(persistent.Persistent):

    id = 'site'

    # List of users as seen by the client.  This is a view on actial
    # user data managed by the auth plugin.  It's assumed that the
    # number of users is limited.
    users = ()
    auth = None
    title = ''

    def __init__(self, title):
        self.title = title
        self.boards = BTrees.OOBTree.BTree()
        self.changes = changes = zc.generationalset.GSet()
        self.changes.add(self)

    def json_reduce(self):
        return dict(
            users=self.users,
            boards=[dict(name=board.name,
                         title=board.title,
                         description=board.description)
                    for board in self.boards.values()],
            )

    def _changed(self):
        self.changes.add(self)
        for board in self.boards.values():
            board.site_changed()

    def update_users(self, users):
        self.users = list(users)
        self._changed()

    def add_board(self, name, title='', description=''):
        if name in self.boards:
            raise KeyError(name)
        self.boards[name] = Board(self, name, title, description)
        self._changed()

    def rename(self, old, name):
        if old == name:
            return
        if name in self.boards:
            raise KeyError(name)
        board = self.boards.pop(old)
        board.name = name
        self.boards[name] = board
        self._changed()

    def updates(self, generation):
        updates = self.changes.generational_updates(generation)
        if len(updates) > 1:
            [site] = updates['adds']
            updates = dict(
                site=site,
                generation=updates['generation'],
                )
        if generation == 0:
            updates['zoid'] = str(u64(self.changes._p_oid))

        return updates

    @property
    def generation(self):
        return self.changes.generation
