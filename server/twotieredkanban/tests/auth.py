import bobo

from .sample import users

def user(base):
    return users[0]


class BadAuth:

    @classmethod
    def user(cls_, base):
        pass

    @classmethod
    def login(cls_):
        return bobo.redirect('/auth/login')

class NonAdminAuth:

    @classmethod
    def user(cls_, base):
        return users[-1]
