import BTrees.OOBTree
import json
import os
import persistent
import re
import time
import uuid
import zc.generationalset

class Kanban(persistent.Persistent):

    id = 'kanban'

    def __init__(self, admin, state_data='model.json'):
        self.changes = zc.generationalset.GSet()
        self.states = zc.generationalset.GSet("states")
        self.changes.add(self.states)
        self.tasks = zc.generationalset.GSet("tasks")
        self.changes.add(self.tasks)
        self.update([admin], [admin])
        self.archive = BTrees.OOBTree.OOBTree() # {release_id -> subset }

        if isinstance(state_data, str):
            if ' ' not in state_data:
                with open(os.path.join(
                    os.path.dirname(__file__), state_data)) as f:
                    state_data = f.read()
            state_data = json.loads(state_data)

        for i, state in enumerate(state_data):
            if isinstance(state, basestring):
                state = dict(label=state)
            substates = state.pop("substates", ())
            state = State(i*(1<<20), **state)
            self.states.add(state)
            for sub in substates:
                sub['parent'] = state.id
                self.states.add(State(i*(1<<20), **sub))

    def updates(self, generation):
        updates = self.changes.generational_updates(generation)
        if len(updates) > 1:
            for add in updates.pop('adds'):
                if add is self:
                    updates[self.id] = self
                else:
                    name = add.pop('id')
                    updates[name] = add
            return updates
        else:
            return None

    def new_release(self, name, description=''):
        self.tasks.add(Task(name, description=description))

    def new_task(self, release_id, name,
                 description='', size=1, blocked=None,
                 ):
        self.tasks.add(Task(name,
                            parent=self.tasks[release_id],
                            description=description,
                            size=size,
                            blocked=blocked,
                            ),
                       )

    def update_task(self, task_id, name,
                    description='', size=1, blocked=None, assigned=None):
        task = self.tasks[task_id]
        task.name = name
        task.description = description
        if task.parent:
            task.assigned = assigned
            task.blocked = blocked
            task.size = size
        self.tasks.changed(task)

    def transition(self, task_id, state):
        task = self.tasks[task_id]
        state = self.states[state]
        if ((task.parent is None or state.parent is None) and
            task.parent is not state.parent):
            raise TaskValueError("Invalid state")
        task.state = state
        self.tasks.changed(task)

    def update(self, users, admins):
        self.users = users
        self.admins = admins
        self.changes.add(self)

    def archive_task(self, task_id):
        task = self.tasks[task_id]
        self.tasks.remove(task)
        if task.parent:
            task.parent.archive += (task,)
        else:
            self.archive[task.id] = task

    def json_reduce(self):
        return dict(
            admins = list(self.admins),
            users = list(self.users),
            )

class TaskTypeError(TypeError):
    """Tried to perform not applicable to task type (release vs task)
    """

class TaskValueError(TypeError):
    """Invalid task value
    """

class State(persistent.Persistent):

    def __init__(self, order, label,
                 working=False, complete=False, parent=None):
        self.id = uuid.uuid1().hex
        self.order = order
        self.label = label
        self.working = working
        self.complete = complete
        self.parent = parent

    def json_reduce(self):
        return self.__dict__.copy()


class Task(persistent.Persistent):

    assigned = None
    state = None
    archive = ()

    def __init__(self, name, description='', size=1, blocked=None, parent=None):
        self.id = uuid.uuid1().hex
        self.created = time.time()
        self.name = name
        self.description = description
        self.size = size
        self.blocked = blocked
        self.parent = parent

    def json_reduce(self):
        result = dict(id = self.id,
                      name = self.name,
                      description = self.description,
                      state = self.state.id if self.state else None,
                      )
        if self.parent:
            result.update(parent = self.parent.id,
                          blocked = self.blocked,
                          created = self.created,
                          assigned = self.assigned,
                          size = self.size,
                          )
        return result
