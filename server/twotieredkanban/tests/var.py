class Var:

    v = None

    def __init__(self, ob=None, name='v', f=None):
        self.name = name
        self.ob = ob
        self.f = f

    def __eq__(self, other):
        ob = self.ob
        if ob is None:
            ob = self
        setattr(ob, self.name, other)
        if self.f is not None:
            self.f(other)
        return True

class Vars:

    def __init__(self):
        self.__vars = {}

    def __getattr__(self, name):
        if name in self.__vars:
            return self.__vars[name]

        var = self.__vars[name] = Var(self, name)
        return var
