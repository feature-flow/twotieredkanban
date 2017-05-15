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
        self.archive = BTrees.OOBTree.OOBTree() # FUTURE {project_id -> subset }

        if isinstance(state_data, str):
            if ' ' not in state_data:
                with open(os.path.join(
                    os.path.dirname(__file__), state_data)) as f:
                    state_data = f.read()
            state_data = json.loads(state_data)

        for i, state in enumerate(state_data):
            if isinstance(state, str):
                state = dict(title=state)
            state = State(i, **state)
            self.states.add(state)

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

    def new_project(self, title, order, description=''):
        self.tasks.add(Task(title, description=description, order=order))

    def new_task(self, project_id, title, order,
                 description='', size=1, blocked=None, assigned=None,
                 ):
        task = Task(title,
                    parent=self.tasks[project_id],
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

    def move(self, task_id, parent_id=None, state_id=None, order=None):
        task = self.tasks[task_id]
        parent = self.tasks[parent_id] if parent_id is not None else None

        if state_id is None:
            if task.parent is not None and parent is not None:
                state = task.state # Still a task, so retain state
            else:
                state = None
        else:
            state = self.states[state_id]

        if parent is not None:
            if parent.parent is not None:
                raise TaskValueError("Can't move project into task")

            if task.parent is None:
                # We're demoting a project to a task. Make sure it has
                # no children
                if any(t for t in self.tasks if t.parent is task):
                    raise TaskValueError(
                        "Can't make non-empty project into a task")

            if state is not None and not state.task:
                raise TaskValueError("Invalid project state")

        else:
            if state is not None and state.task:
                raise TaskValueError("Invalid task state")

        task.parent = parent
        task.state = state
        if order is not None:
            task.order = order

        if state is not None and state.complete:
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
    """Tried to perform not applicable to task type (project vs task)
    """

class TaskValueError(TypeError):
    """Invalid task value
    """

class State(persistent.Persistent):

    def __init__(self, order, title, id=None, explode=False,
                 working=False, complete=False, task=False):
        self.id = id or title
        self.order = order
        self.title = title
        self.working = working
        self.complete = complete
        self.task = task
        self.explode = explode

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
