import BTrees.OOBTree
import json
import os
import persistent
import re
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
                state['tag'] = state['label'].lower().replace(' ', '_')

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
    size = 1
    complete = False
    size_match = re.compile(r"\s*\[\s*(\d+)\s*\]\s*").match

    def __init__(self, name, description, state=None):
        self.id = uuid.uuid1().hex
        self.created = time.time()
        self.update_name(name)
        self.description = description
        self.state = state

    def update_name(self, name):
        self.name = name
        m = self.size_match(name)
        if m is not None:
            self.size = int(m.group(1))

    def update(self, name=None, description=None, state=None,
               assigned=None, blocked=None, size=None):
        if name is not None:
            self.update_name(name)
        if description is not None:
            self.description = description
        if state is not None:
            self.state = state
        if assigned is not None:
            self.assigned = assigned
        if blocked is not None:
            self.blocked = blocked
        if size is not None:
            self.size = size

    def json_reduce(self):
        return dict(id = self.id,
                    name = self.name,
                    description = self.description,
                    state = self.state['tag'] if self.state else None,
                    blocked = self.blocked,
                    created = self.created,
                    assigned = self.assigned,
                    size = self.size,
                    )

class Release(Task):

    archived = ()

    def __init__(self, kanban, name, description):
        self.kanban = kanban
        super(Release, self).__init__(name, description)
        self.tasks = zc.generationalset.GSet(self.id, kanban.releases)
        self.tasks.add(self)
        self.tasks.release = self # So we're reachabe from the kanban :/

    def update_name(self, name):
        self.name = name

    def new_task(self, name, description):
        if self.state and 'substates' in self.state:
            state = self.state['substates'][0]
        else:
            state = None
        task = Task(name, description, state)
        self.tasks.add(task)
        self.tasks.add(self)

    def update(self, state, **kw):
        if state is not None:
            state, = [s for s in self.kanban.states if s['tag'] == state]
        super(Release, self).update(state=state, **kw)
        self.tasks.add(self)

        if state is not None:
            substates = state.get('substates')
            if substates:
                for task in list(self.tasks):
                    if not task.state:
                        task.state = substates[0]
                        self.tasks.add(task)

    def update_task(self, task_id, state, **kw):
        task = self.tasks[task_id]
        size = task.size
        complete = task.complete
        if state:
            state, = [s for s in self.state['substates'] if s['tag'] == state]
            task.complete = state.get("complete")
        task.update(state=state, **kw)
        self.tasks.add(task)
        if task.size != size or task.complete != complete:
            self.tasks.add(self)

    @property
    def size(self):
        return sum(t.size for t in self.tasks if t is not self)

    def archive(self, task_id):
        task = self.tasks[task_id]
        self.archived += (task, )
        self.tasks.remove(task)

    def json_reduce(self):
        data = super(Release, self).json_reduce()
        data.update(completed = sum(t.size for t in self.tasks if t.complete))
        return data
