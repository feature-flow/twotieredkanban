import persistent

class Site(persistent.Persistent):

    def __init__(self, initial_email):
        from BTrees.OOBTree import BTree
        self.boards = BTree()
        self.users = self.admins = [initial_email]

    def update_users(self, users, admins):
        self.users = list(users)
        self.admins = list(admins)
