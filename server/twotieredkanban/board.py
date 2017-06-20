import bleach
import BTrees.Length
import BTrees.OOBTree
import datetime
import json
import os
import persistent
import uuid
import zc.generationalset
from ZODB.utils import u64

def now():
    return datetime.datetime.utcnow().isoformat()

class Board(persistent.Persistent):

    id = 'board'

    def __init__(self, site, name, title='', description='',
                 state_data='model.json'):
        self.site = site
        self.changes = changes = zc.generationalset.GSet()
        self.states = zc.generationalset.GSet("states", changes)
        self.tasks = zc.generationalset.GSet("tasks", changes)
        self.subtasks = BTrees.OOBTree.OOBTree() # {parent_id => [tasks]}
        self.update(name, title, description)

        # {feature_id -> feature }
        self.archive = BTrees.OOBTree.OOBTree()
        #self._archive_count = BTrees.Length()

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

        self.default_task_state = [s for s in self.states if s.task][0]
        self.default_project_state = [s for s in self.states if not s.task][0]

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
            archive_count=self.archive_count,
            )

    def updates(self, generation):
        updates = self.changes.generational_updates(generation)
        if len(updates) > 1:
            for add in updates.pop('adds'):
                if add is self:
                    updates[self.id] = self
                    updates[self.site.id] = self.site
                else:
                    name = add.pop('id')
                    updates[name] = add
            if generation == 0:
                updates['zoid'] = str(u64(self.changes._p_oid))
            return updates
        else:
            return None

    def new_project(self, title, order, description=''):
        self.tasks.add(
            Task(self,
                 title,
                 description=description,
                 order=order,
                 state=self.default_project_state,
                 )
            )

    def new_task(self, project_id, title, order,
                 description='', size=1, blocked=None, assigned=None,
                 ):
        task = Task(self,
                    title,
                    parent=self.tasks[project_id],
                    description=description,
                    size=size,
                    blocked=blocked,
                    assigned=assigned,
                    order=order,
                    state=self.default_task_state,
                    )
        self.tasks.add(task)
        self.subtasks[project_id] = (
            self.subtasks.get(project_id, ()) + (task,))

        return task

    def update_task(self, task_id, **data):
        task = self.tasks[task_id]
        task.update(**data)
        self.tasks.changed(task)

    def move(self, task_id, parent_id=None, state_id=None, order=None,
             user_id=None):
        task = self.tasks[task_id]
        parent = self.tasks[parent_id] if parent_id is not None else None

        if state_id is None:
            if (task.parent is not None and parent is not None
                or
                task.parent == parent # None
                ):
                state = task.state # Still wharever it was
            elif parent is None:
                state = self.default_project_state
            else:
                state = self.default_task_state
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

        update_subtasks_working = (
            not task.parent and
            not parent_id and
            state_id != task.state.id and
            state.explode != task.state.explode)

        new_event = (
            state_id != task.state.id or
            (parent and parent.state.explode) !=
            (task.parent and task.parent.state.explode)
            )

        if task.parent is not parent:
            if task.parent:
                self.subtasks[task.parent.id] = tuple(
                    t for t in self.subtasks[task.parent.id] if t is not task)
            if parent:
                self.subtasks[parent.id] = (
                    self.subtasks.get(parent.id, ()) + (task,))

        task.parent = parent
        task.state = state
        if order is not None:
            task.order = order

        if state.task:
            if (state.working):
                task.assigned = user_id
        else:
            task.assigned = None

        if new_event:
            task._new_event()

        self.tasks.changed(task)

        if update_subtasks_working:
            for subtask in self.subtasks.get(task.id, ()):
                subtask._new_event()
                self.tasks.changed(subtask)

    @property
    def archive_count(self):
        try:
            return self._archive_count.value
        except AttributeError:
            return 0

    @archive_count.setter
    def archive_count(self, v):
        try:
            self._archive_count.value = v
        except AttributeError:
            self._archive_count = BTrees.Length.Length(v)
        self.changes.add(self)

    def archive_feature(self, feature_id):
        feature = self.tasks[feature_id]
        if feature.parent:
            raise TaskValueError("Can't archive a task")
        assert(feature.id == feature_id)
        self.tasks.remove(feature)
        feature.tasks = self.subtasks.pop(feature_id)
        for task in feature.tasks:
            self.tasks.remove(task)
        self.archive[feature_id] = feature
        self.archive_count += 1
        last = feature.history[-1]
        event = dict(last)
        last['end'] = now()
        event['start'] = last['end']
        event['archived'] = True
        feature.history += (event,)

    def restore_feature(self, feature_id):
        feature = self.archive.pop(feature_id)
        self.tasks.add(feature)
        self.subtasks[feature_id] = feature.tasks
        for task in feature.tasks:
            self.tasks.add(task)
        del feature.tasks
        self.archive_count -= 1
        last = feature.history[-1]
        event = dict(last)
        last['end'] = now()
        event['start'] = last['end']
        del event['archived']
        feature.history += (event,)

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
    history = ()

    def __init__(self, board, title, order, description='',
                 size=1, blocked=None, assigned=None, parent=None, state=None):
        assert(state is not None)
        self.board = board # to make searching easier later
        self.id = uuid.uuid1().hex
        self.title = title
        self.description = sanitize(description)
        self.order = order
        self.size = size
        self.blocked = blocked
        self.assigned = assigned
        self.parent = parent
        self.state = state
        self._new_event()

    def _new_event(self):
        event = dict(start=now())
        state = self.state
        event['state'] = state.id
        if state.complete:
            event['complete'] = True
        elif state.working:
            if self.parent:
                if self.parent.state and self.parent.state.explode:
                    event['working'] = True
            else:
                event['working'] = True

        if self.assigned:
            event['assigned'] = self.assigned

        if self.history:
            self.history[-1]['end'] = event['start']

        self.history += (event,)

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
                raise TypeError(name, self.update_types[name])
            setattr(self, name, data[name])
            if name == 'assigned':
                self.history[-1][name] = data[name]
            if name == 'description':
                self.description = sanitize(self.description)

    def json_reduce(self):
        return dict(id = self.id,
                    title = self.title,
                    description = self.description,
                    order = self.order,
                    state = self.state.id if self.state else None,
                    parent =
                    self.parent.id if self.parent is not None else None,
                    blocked = self.blocked,
                    assigned = self.assigned,
                    size = self.size,
                    history = self.history,
                    )

allowed_tags = ['a', 'blockquote', 'br', 'code', 'del', 'em',
                'h1', 'h2', 'h3', 'ins', 'li', 'ol', 'p',
                'pre', 'strong', 'ul']

def sanitize(html):
    return bleach.linkify(bleach.clean(html, allowed_tags))
