import BTrees.OOBtree
import json
import os
import persistent
import time
import uuid
import zc.generationalset


class Kanban:

    id = ''

    def __init__(self, admin, state_data='model.json'):
        self.releases = zc.generationalset.GSet()
        self.releases.add(self)
        self.admins = BTrees.OOBtree.TreeSet([admin])
        self.users = BTrees.OOBtree.TreeSet([admin])
        self.archive = BTrees.OOBtree.OOBTree()

        if isinstance(state_data, str):
            if ' ' not in state_data:
                with open(os.path.join(
                    os.path.dirname(__file__), state_data)) as f:
                    state_data = f.read()
            state_data = json.loads(state_data)
        self.load_states(state_data)

    def new_release(self, name, description=''):
        self.releases.add(Release(name, description))

    def load_states(self, data):

        self.done_states = set()
        self.working_states = set()

        def normalize_state(state):
            if isinstance(state, basestring):
                state = dict(
                    label = state,
                    )

            if 'tag' not in state:
                state['tag'] = state['label'].lower() # XXX for now

            if state.get('complete'):
                self.done_states.add(state['tag'])

            if state.get('working'):
                self.working_states.add(state['tag'])

            if 'substates' in state:
                state['substates'] = map(normalize_state, state['substates'])

            return state

        self.states = normalize_state(data)

    def json_reduce(self):
        return dict(
            admins = self.admins,
            users = self.users,
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

    def json_reduce(self):
        return dict(id = self.id,
                    name = self.name,
                    description = self.description,
                    blocked = self.blocked,
                    created = self.created,
                    assigned = self.assigned,
                    )

class Release(Task):

    def __init__(self, name, description, state):
        super(Release, self).__init__(name, description, state)
        self.tasks = zc.generationalset.GSet(self.id)
        self.tasks.add(self)

    def generational_updates(self, generation):
        return self.tasks.generational_updates(generation)

    def __getitem__(self, task_id):
        return self.tasks[task_id]

    def new_task(self, name, description):
        self.tasks.add(Task(name, description))

    def edit(self, name, description):
        self.name = name
        self.description = description
        self.tasks.add(self)

    def edit_task(self, id, name, description):
        task = self.tasks[id]
        task.name = name
        task.description = description
        tasks.add(task)
