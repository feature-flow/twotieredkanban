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
        self.changes = changes = zc.generationalset.GSet()
        self.states = zc.generationalset.GSet("states", changes)
        self.tasks = zc.generationalset.GSet("tasks", changes)
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

    def new_release(self, name, order, description=''):
        self.tasks.add(Task(name, description=description, order=order))

    def new_task(self, release_id, name, order,
                 description='', size=1, blocked=None,
                 ):
        self.tasks.add(Task(name,
                            parent=self.tasks[release_id],
                            description=description,
                            size=size,
                            blocked=blocked,
                            order=order,
                            ),
                       )

    def update_task(self, task_id, name=None, description=None, order=None,
                    size=None, blocked=None, assigned=None):
        task = self.tasks[task_id]
        if any((
            update_attr(task, 'name', name),
            update_attr(task, 'description', description),
            update_attr(task, 'order', order),
            update_attr(task, 'size', size),
            update_attr(task, 'blocked', blocked),
            update_attr(task, 'assigned', assigned),
            )):
            self.tasks.changed(task)

    def transition(self, task_id, parent_id, state, order):
        task = self.tasks[task_id]
        parent = self.tasks[parent_id] if parent_id is not None else None
        if parent is not task.parent:
            if task.parent is None:
                # We're demoting a release to a task. Make sure it has
                # no children
                if any(t for t in self.tasks if t.parent is task):
                    raise TaskValueError(
                        "Can't make non-empty project into a task")
            task.parent = parent

        state = self.states[state]
        if ((task.parent is None or state.parent is None) and
            task.parent is not state.parent): # both or neither are None
            raise TaskValueError("Invalid state")
        if task.parent:
            if state.complete:
                if not task.complete:
                    task.complete = time.time()
            else:
                task.complete = None
        task.state = state
        task.order = order
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

def update_attr(ob, name, v):
    if v is not None and v != getattr(ob, name):
        setattr(ob, name, v)
        return True

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
    complete = None

    def __init__(self, name, order, description='',
                 size=1, blocked=None, parent=None):
        self.id = uuid.uuid1().hex
        self.created = time.time()
        self.name = name
        self.description = description
        self.order = order
        self.size = size
        self.blocked = blocked
        self.parent = parent

    def json_reduce(self):
        return dict(id = self.id,
                    name = self.name,
                    description = self.description,
                    order = self.order,
                    state = self.state.id if self.state else None,
                    parent =
                    self.parent.id if self.parent is not None else None,
                    blocked = self.blocked,
                    created = self.created,
                    assigned = self.assigned,
                    size = self.size,
                    complete = self.complete,
                    )
