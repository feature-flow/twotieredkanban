import bobo
import gevent.queue
import json
import logging
import os
import re
import requests
import sys
import zc.asanakanban.auth
import zc.dojoform
import zc.thread

logger = logging.getLogger(__name__)
logging.basicConfig()

def config(options):
    global api_key
    api_key = options['api']

class Cache:

    def __init__(self):
        self.tasks = {}
        self.puts = {}
        self.get = self.tasks.get
        self.gen = 0

    def get(self, task_id, getter, uuid):
        tasks = self.tasks
        try:
            return tasks[task_id]
        except KeyError:
            task = getter("tasks/%s" % task_id)
            self.get_subtasks(task, getter)
            return task

    def send(self, task, uuid):
        tasks = self.tasks
        task_id = task['id']
        try:
            old = tasks[task_id]
        except KeyError:
            # Not in cache
            tasks[task_id] = task
            self.gen += 1
        else:
            if task['modified_at'] > old['modified_at']:
                old.update(task)
                self.gen += 1
            task = old

        task = json.dumps((self.gen, task))
        try:
            put = self.puts[uuid]
        except KeyError:
            pass
        else:
            put(task)

    def invalidate(self, task):
        for uuid in self.puts:
            self.send(task, uuid)

try:
    caches
except NameError:
    caches = {}

def error(message):
    raise bobo.BoboException(
        403,
        json.dumps(dict(error=message)),
        content_type='application/json',
        )

def asana_error(r):
    if "application/json" in r.headers['content-type']:
        message = r.json()['errors'][0]['message']
    else:
        message = "Asana call failed"
    error(message)

def read_file(path):
    with open(os.path.join(os.path.dirname(__file__), path)) as f:
        return f.read()


@bobo.query("/", check=zc.asanakanban.auth.checker)
def index_html():
    return read_file("akb.html")

@bobo.query("/akb.js", content_type="application/javascript")
def akb_js():
    return read_file("akb.js")

@bobo.query("/akb.css", content_type="text/css")
def akb_css():
    return read_file("akb.css")

@bobo.query("/dojo/zc.dojo.js", content_type="application/javascript")
def zc_dojo_js():
    return read_file(os.path.join(os.path.dirname(zc.dojoform.__file__),
                                  "resources/zc.dojo.js"))

@bobo.query("/zc.dojo.css", content_type="text/css")
def zc_dojo_css():
    return read_file(os.path.join(os.path.dirname(zc.dojoform.__file__),
                                  "resources/zc.dojo.css"))


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

states = map(normalize_state, json.loads(read_file('model.json')))

tag_ids = {} # {workspace_id -> {tag_name -> tag_id}}

@bobo.subroute("/api", scan=True)
class API:

    def __init__(self, request):
        self.request = request

    @property
    def workspace_id(self):
        return self.request.cookies["X-Workspace-ID"]

    @property
    def cache(self):
        key = "%s-%s" % (self.workspace_id, self.project_id)
        try:
            return caches[key]
        except KeyError:
            caches[key] = Cache()
            return caches[key]

    @property
    def project_id(self):
        return self.request.cookies["X-Project-ID"]

    @property
    def uuid(self):
        return self.request.cookies["X-UUID"]

    def make_request(self, method, url, data=None):
        if data:
            options = dict(
                data=json.dumps(dict(data=data)),
                headers={'Content-Type': 'application/json'},
                )
        else:
            options = {}

        try:
            r = getattr(requests, method)(
                'https://app.asana.com/api/1.0/' + url,
                auth=(api_key, ''),
                **options)
        except Exception, e:
            error("Couldn't connect to Asana, %s: %s" % (
                e.__class__.__name__, e))

        logger.info("%s %s %s %s", method, url, data, r.ok)

        if not r.ok:
            asana_error(r)

        return r.json()['data']


    def get(self, url):
        return self.make_request('get', url)

    def post(self, url, method='post', **data):
        return self.make_request('post', url, data)

    def put(self, url, **data):
        return self.make_request('put', url, data)

    def delete(self, url):
        return self.make_request('delete', url)

    @bobo.query("/workspaces", content_type='application/json', check=zc.asanakanban.auth.checker)
    def workspaces(self):
        return dict(data=self.get('workspaces'))

    @bobo.query("/workspaces/:workspace/projects",
                content_type='application/json', check=zc.asanakanban.auth.checker)
    def projects(self, workspace):
        return dict(data=self.get('workspaces/%s/projects' % workspace))

    @bobo.query("/model.json", content_type="application/json", check=zc.asanakanban.auth.checker)
    def model_json(self):
        return dict(states=states)

    def get_task(self, task_id):
        task = self.get("tasks/%s" % task_id)
        if not task.get('parent'):
            task['subtasks'] = self.get(
                "tasks/%s/subtasks" % task_id)
        return task

    def get_tasks_in_threads(self, tasks):
        for task_summary in tasks:
            task_id = task_summary['id']
            task = self.cache.get(task_id)
            if task is None:
                task = self.get_task(task_id)
            yield task

    @bobo.query("/project/:generation?", content_type="application/json", check=zc.asanakanban.auth.checker)
    def project(self, generation=None):
        if generation is not None and int(generation) != self.cache.gen:
            error("You were disconnected too long")

        try:
            ws = self.request.environ["wsgi.websocket"]
            uuid = self.uuid
            print 'project start', uuid
            queue = gevent.queue.Queue()
            get = queue.get
            try:
                self.cache.puts[uuid] = queue.put
                for task in self.get_tasks_in_threads(
                    self.get("projects/%s/tasks" % self.project_id)
                    ):
                    if not task.get('completed'):
                        self.cache.send(task, uuid)
                        ws.send(get())

                while 1:
                    ws.send(get())
                    # print 'sent', uuid
            finally:
                self.cache.puts.pop(uuid, None)
                ws.close()
        except:
            logger.exception("/project %s" % uuid)
            raise

    @bobo.query("/subtasks/:task_id", content_type="application/json", check=zc.asanakanban.auth.checker)
    def subtasks(self, task_id):
        uuid = self.uuid
        for task in self.get_tasks_in_threads(
            self.get("tasks/%s/subtasks" % task_id)
            ):
            self.cache.send(task, uuid)

    def tag_id(self, state):
        workspace_id = self.workspace_id
        ids = tag_ids.get(workspace_id)
        if not ids:
            ids = tag_ids[workspace_id] = dict(
                (t['name'], t['id'])
                for t in self.get("workspaces/%s/tags" % workspace_id)
                )

        if state not in ids:
            data = self.post("workspaces/%s/tags" % workspace_id,
                             name=state)
            ids[state] = data['id']

        return ids[state]

    def move_data(self, node_id):
        if node_id:
            state = node_id.split('_')[0]
            return state, self.tag_id(state)
        else:
            return "", ""

    @bobo.post("/moved", content_type='application/json', check=zc.asanakanban.auth.checker)
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

    @bobo.post("/take", content_type='application/json', check=zc.asanakanban.auth.checker)
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
        t = self.get_task(task_id);
        self.cache.invalidate(t)
        if not t.get('parent'):
            for subtask in t['subtasks']:
                self.refresh(subtask['id'])

    @bobo.query("/remove",
                content_type='application/json',
                check=zc.asanakanban.auth.checker)
    def remove(self, task_id):
        return self.delete("tasks/%s" % task_id)


