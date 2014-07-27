import BTrees.OOBTree
import json
import os
import persistent
import time
import uuid
import zc.generationalset

class Kanban(persistent.Persistent):

    id = ''

    def __init__(self, admin, state_data='model.json'):
        self.releases = zc.generationalset.GSet()
        self.releases.add(self)
        self.admins = BTrees.OOBTree.TreeSet([admin])
        self.users = BTrees.OOBTree.TreeSet([admin])
        self.archived = BTrees.OOBTree.OOBTree() # {release_id -> subset }

        if isinstance(state_data, str):
            if ' ' not in state_data:
                with open(os.path.join(
                    os.path.dirname(__file__), state_data)) as f:
                    state_data = f.read()
            state_data = json.loads(state_data)
        self.load_states(state_data)

    def load_states(self, data):

        self.working_states = set()

        def normalize_state(state):
            if isinstance(state, basestring):
                state = dict(
                    label = state,
                    )

            if 'tag' not in state:
                state['tag'] = state['label'].lower()

            if state.get('working'):
                self.working_states.add(state['tag'])

            if 'substates' in state:
                state['substates'] = map(normalize_state, state['substates'])

            return state

        self.states = map(normalize_state, data)

    def changed(self):
        self.releases.add(self)

    def new_release(self, name, description=''):
        Release(self, name, description)

    def archive(self, release_id):
        release = self.releases[release_id]
        self.releases.remove(release)
        self.archived[release.id] = release

    def __getitem__(self, release_id):
        return self.releases[release_id].release

    def json_reduce(self):
        return dict(
            id = self.id,
            admins = list(self.admins),
            users = list(self.users),
            )

class Task(persistent.Persistent):

    assigned = None
    blocked = ''

    def __init__(self, name, description, state):
        self.id = uuid.uuid1().hex
        self.created = time.time()
        self.name = name
        self.description = description
        self.state = state

    def update(self, name=None, description=None, state=None,
               assigned=None, blocked=None):
        if name is not None:
            self.name = name
        if description is not None:
            self.description = description
        if state is not None:
            self.state = state
        if assigned is not None:
            self.assigned = assigned
        if blocked is not None:
            self.blocked = blocked

    def json_reduce(self):
        return dict(id = self.id,
                    name = self.name,
                    description = self.description,
                    state = self.state['tag'] if self.state else None,
                    blocked = self.blocked,
                    created = self.created,
                    assigned = self.assigned,
                    )

class Release(Task):

    def __init__(self, kanban, name, description):
        self.kanban = kanban
        state = kanban.states[0]
        super(Release, self).__init__(name, description, state)
        self.tasks = zc.generationalset.GSet(self.id, kanban.releases)
        self.tasks.add(self)
        self.tasks.release = self # So we're reachabe from the kanban :/
        self.archived = ()

    def new_task(self, name, description):
        if 'substates' in self.state:
            state = self.state['substates'][0]
        else:
            state = None
        self.tasks.add(Task(name, description, state))

    def update(self, state, **kw):
        state, = [s for s in self.kanban.states if s['tag'] == state]
        super(Release, self).update(state=state, **kw)
        self.tasks.add(self)

        substates = state.get('substates')
        if substates:
            for task in list(self.tasks):
                if not task.state:
                    task.state = substates[0]
                    self.tasks.add(task)

    def update_task(self, task_id, state, **kw):
        task = self.tasks[task_id]
        state, = [s for s in self.state['substates'] if s['tag'] == state]
        task.update(state=state, **kw)
        self.tasks.add(task)

    def archive(self, task_id):
        task = self.tasks[task_id]
        self.archived += (task, )
        self.tasks.remove(task)

