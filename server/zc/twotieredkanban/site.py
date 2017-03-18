import persistent
from . import model

class Site(persistent.Persistent):

    def __init__(self, initial_email):
        from BTrees.OOBTree import BTree
        self.boards = BTree()
        self.users = self.admins = [initial_email] # Future: persistent

    def update_users(self, users, admins):
        self.users = list(users)
        self.admins = list(admins)
        for board in self.boards.values():
            board.update_users(self.users, self.admins)

    def add_board(self, name, title, description):
        self.boards[name] = model.Kanban(name, title, description)
        self.boards[name].update_users(self.user, self.admins)
