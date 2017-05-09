import BTrees.OOBTree
import json
import os
import persistent
import re
import time
import uuid
import zc.generationalset

class Board(persistent.Persistent):

    id = 'board'

    def __init__(self, site, name, title='', description='',
                 state_data='model.json'):
        self.site = site
        self.changes = changes = zc.generationalset.GSet()
        self.states = zc.generationalset.GSet("states", changes)
        self.tasks = zc.generationalset.GSet("tasks", changes)
        self.update(name, title, description)
        self.archive = BTrees.OOBTree.OOBTree() # FUTURE {release_id -> subset }

        if isinstance(state_data, str):
            if ' ' not in state_data:
                with open(os.path.join(
                    os.path.dirname(__file__), state_data)) as f:
                    state_data = f.read()
            state_data = json.loads(state_data)

        for i, state in enumerate(state_data):
            if isinstance(state, str):
                state = dict(title=state)
            substates = state.pop("substates", ())
            state = State(i*(1<<20), **state)
            self.states.add(state)
            for sub in substates:
                sub['parent'] = state.id
                self.states.add(State(i*(1<<20), **sub))

    @property
    def generation(self):
        return self.changes.generation

    def update(self, name, title, description):
        self.name = name
        self.title = title
        self.description = description
        self.changes.add(self)

    def site_changed(self):
        self.changes.add(self)

    def json_reduce(self):
        return dict(
            name=self.name,
            title=self.title,
            description=self.description,
            site = self.site,
            )

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

    def new_release(self, title, order, description=''):
        self.tasks.add(Task(title, description=description, order=order))

    def new_task(self, release_id, title, order,
                 description='', size=1, blocked=None, assigned=None,
                 ):
        task = Task(title,
                    parent=self.tasks[release_id],
                    description=description,
                    size=size,
                    blocked=blocked,
                    assigned=assigned,
                    order=order,
                    )
        self.tasks.add(task)
        return task

    def update_task(self, task_id, **data):
        task = self.tasks[task_id]
        task.update(**data)
        self.tasks.changed(task)

    def move(self, task_id, parent_id, state, order):
        task = self.tasks[task_id]
        parent = self.tasks[parent_id] if parent_id is not None else None
        state = self.states[state]

        if parent is not None:
            if parent.parent is not None:
                raise TaskValueError("Can't move project into task")

            if task.parent is None:
                # We're demoting a release to a task. Make sure it has
                # no children
                if any(t for t in self.tasks if t.parent is task):
                    raise TaskValueError(
                        "Can't make non-empty project into a task")

            if state.parent is None:
                raise TaskValueError("Invalid project state")

        else:
            if state.parent is not None:
                raise TaskValueError("Invalid task state")

        task.parent = parent
        task.state = state
        task.order = order
        if state.complete:
            if not task.complete:
                task.complete = time.time()
        else:
            task.complete = None

        self.tasks.changed(task)

    # def archive_task(self, task_id):
    #     task = self.tasks[task_id]
    #     self.tasks.remove(task)
    #     if task.parent:
    #         task.parent.archive += (task,)
    #     else:
    #         self.archive[task.id] = task

class TaskTypeError(TypeError):
    """Tried to perform not applicable to task type (release vs task)
    """

class TaskValueError(TypeError):
    """Invalid task value
    """

class State(persistent.Persistent):

    def __init__(self, order, title,
                 working=False, complete=False, parent=None):
        self.id = uuid.uuid1().hex
        self.order = order
        self.title = title
        self.working = working
        self.complete = complete
        self.parent = parent

    def json_reduce(self):
        return self.__dict__.copy()


class Task(persistent.Persistent):

    state = None
    #archive = ()
    complete = None

    def __init__(self, title, order, description='',
                 size=1, blocked=None, assigned=None, parent=None):
        self.id = uuid.uuid1().hex
        self.created = time.time()
        self.title = title
        self.description = description
        self.order = order
        self.size = size
        self.blocked = blocked
        self.assigned = assigned
        self.parent = parent

    update_types = dict(
        title=str,
        description=str,
        size=int,
        blocked=(type(None), str),
        assigned=(type(None), str),
        )

    def update(self, **data):
        for name in data:
            if not isinstance(data[name], self.update_types[name]):
                raise TypeError(name, update_types[name])
            setattr(self, name, data[name])

    def json_reduce(self):
        return dict(id = self.id,
                    title = self.title,
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
