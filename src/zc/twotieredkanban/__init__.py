import bobo
import gevent.queue
import json
import logging
import os
import persistent
import requests
import time
import zc.dojoform
import zc.generationalset
import zope.cachedescriptors

logger = logging.getLogger(__name__)

def error(message):
    raise bobo.BoboException(
        403,
        json.dumps(dict(error=message)),
        content_type='application/json',
        )

def read_file(path):
    with open(os.path.join(os.path.dirname(__file__), path)) as f:
        return f.read()

@bobo.query("/")
def index_html():
    return read_file("kb.html")

@bobo.query("/kb.js", content_type="application/javascript")
def kb_js():
    return read_file("kb.js")

@bobo.query("/kb.css", content_type="text/css")
def kb_css():
    return read_file("kb.css")

@bobo.query("/dojo/zc.dojo.js", content_type="application/javascript")
def zc_dojo_js():
    return read_file(os.path.join(os.path.dirname(zc.dojoform.__file__),
                                  "resources/zc.dojo.js"))

@bobo.query("/zc.dojo.css", content_type="text/css")
def zc_dojo_css():
    return read_file(os.path.join(os.path.dirname(zc.dojoform.__file__),
                                  "resources/zc.dojo.css"))

class Task(persistent.Persistent)

    def __init__(self, parent):
        self.parent._p_jar.add(self)
        data = zc.generationalset.GSet(self._p_pod, parent, superset=True)
        changes = zc.generationalset.GSet(
            'changes', data, id_attribute='_p_oid')
        changes.add(self)

class Release():

    def __init__(self, parent):
        self.parent._p_jar.add(self)
        data = zc.generationalset.GSet(self._p_pod, parent, superset=True)
        changes = zc.generationalset.GSet(
            'changes', data, id_attribute='_p_oid')
        changes.add(self)
        tasks - 

class Kanban(persistent.Persistent):

    def __init__(self):

        data = zc.generationalset.GSet(superset=True)
        tasks = zc.generationalset.GSet('tasks', data)

        done_states = set()
        working_states = set()

        def normalize_state(state):
            if isinstance(state, basestring):
                state = dict(
                    label = state,
                    )

            if 'tag' not in state:
                state['tag'] = state['label'].lower() # XXX for now

            if state.get('complete'):
                done_states.add(state['tag'])

            if state.get('working'):
                working_states.add(state['tag'])

            if 'substates' in state:
                state['substates'] = map(normalize_state, state['substates'])

            return state

        self.states = map(normalize_state, json.loads(read_file('model.json')))
        self.done_states = done_states
        self.working_states = working_states

clients = set()

def notify(gset):
    if not gset.id: # top-level set
        for put in clients:
            put('') # Notify clients

zc.generationalset.notify = notify

@bobo.subroute("/api", scan=True)
class API:

    def __init__(self, request=None):
        self.request = request
        self.kanban = conn.root.kanban

    @bobo.query("/model.json", content_type="application/json")
    def model_json(self):
        return dict(states=self.kanban.states)

    @bobo.get('/updates/:generation', content_type="application/json")
    def updates(self, generation):
        return self.kanban.tasks.generational_updates(generation)

    @bobo.query("/connect", content_type="application/json")
    def project(self):

        try:
            ws = self.request.environ["wsgi.websocket"]
            queue = gevent.queue.Queue()
            get = queue.get
            put = queue.put
            try:
                clients.add(put)
                while 1:
                    ws.send(get())
            finally:
                clients.remove(put)
                ws.close()
        except:
            logger.exception("/connect")
            raise


    def move_data(self, node_id):
        if node_id:
            state = node_id.split('_')[0]
            return state, self.tag_id(state)
        else:
            return "", ""

    @bobo.post("/moved",
               content_type='application/json',
               check=zc.asanakanban.auth.checker)
    def moved(self, old_state, new_state, task_ids):
        print 'moved', self.uuid, old_state, new_state, task_ids
        old_state_id = self.tag_id(old_state) if old_state else ""
        new_state_id = self.tag_id(new_state) if new_state else ""
        if isinstance(task_ids, basestring):
            task_ids = task_ids,

        for task_id in task_ids:
            if old_state:
                self.post("tasks/%s/removeTag" % task_id, tag=old_state_id)
            if new_state:
                self.post("tasks/%s/addTag" % task_id, tag=new_state_id)

            task = self.put("tasks/%s" % task_id,
                            completed = new_state in done_states,
                            assignee = ("me"
                                        if new_state in working_states
                                        else None))
            self.cache.invalidate(task)

        return {}

    @bobo.post("/take",
               content_type='application/json',
               check=zc.asanakanban.auth.checker)
    def take(self, task_id):
        self.cache.invalidate(self.put("tasks/%s" % task_id, assignee = "me"))

    @bobo.post("/blocked",
               content_type='application/json',
               check=zc.asanakanban.auth.checker)
    def blocked(self, task_id, is_blocked):
        tag_id = self.tag_id('blocked')
        if is_blocked == 'true':
            self.post("tasks/%s/addTag" % task_id, tag=tag_id)
        else:
            self.post("tasks/%s/removeTag" % task_id, tag=tag_id)
        self.cache.invalidate(self.get("tasks/%s" % task_id))

    @bobo.post("/add_task",
               content_type='application/json',
               check=zc.asanakanban.auth.checker)
    def add_task(self, name, description, parent=None):
        options = (dict(parent=parent) if parent
                   else dict(projects=[self.project_id]))
        t = self.post("tasks",
                      workspace=self.workspace_id,
                      name=name,
                      notes=description,
                      **options)
        self.cache.invalidate(t)
        if parent:
            self.cache.invalidate(self.get_task(parent))

    @bobo.post("/edit_task",
               content_type='application/json',
               check=zc.asanakanban.auth.checker)
    def edit_task(self, id, name, description):
        t = self.put("tasks/%s" % id,
                      name=name,
                      notes=description,
                      )
        self.cache.invalidate(t)

    @bobo.query("/refresh/:task_id",
                content_type='application/json',
                check=zc.asanakanban.auth.checker)
    def refresh(self, task_id):
        t = self.get_task(task_id)
        self.cache.invalidate(t)
        if not t.get('parent'):
            for subtask in t['subtasks']:
                self.refresh(subtask['id'])

    @bobo.query("/remove",
                content_type='application/json',
                check=zc.asanakanban.auth.checker)
    def remove(self, task_id):
        self.delete("tasks/%s" % task_id)
        parent = self.cache.delete(int(task_id))
        if parent:
            t = self.get_task(parent['id']);
            self.cache.invalidate(t)
