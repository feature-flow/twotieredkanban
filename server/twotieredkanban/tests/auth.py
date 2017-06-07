import bobo

from .sample import users

class NonAdmin:

    def user(self, request):
        return users[-1]

class Admin:

    def user(self, request):
        return users[0]

class Bad:

    def user(self, request):
        pass

    def login(self, request):
        return bobo.redirect('/auth/login')
