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

clients = set()

class Encoder(json.JSONEncoder):

    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()[:19]
        return obj.json_reduce()

@bobo.subroute("/kb", scan=True)
class API:

    def __init__(self, request):
        self.request = request
        connectiion = request.environ['zodb.connection']
        self.root = = root = connection.root
        self.kanban = root.kanban


    def response(self, **data):
        response = webob.Response(content_type="application/json")
        generation = self.request.headers.get('x-generation', 0)
        updates = self.kanban.releases.generational_updates(int(generation))
        if updates:
            data['updates'] = updates
        response.body = json.dumps(data, cls=Encoder)
        response.cache_control = 'no-cache'
        response.pragma = 'no-cache'
        return response

    @bobo.get("/model.json", content_type="application/json")
    def model_json(self):
        return dict(states=self.kanban.states)

    @bobo.get("/poll")
    def poll(self):
        return self.response()

    def _tasks(self, parent_id, task_id=None):
        tasks = self.releases
        if parent_id:
            tasks = tasks[parent_id]
        if task_id:
            tasks = tasks[task_id]
        return tasks
    _task = tasks

    @bobo.post("/blocked",
               content_type='application/json',
               check=zc.asanakanban.auth.checker)
    def blocked(self, task_id, is_blocked, parent_id):
        self._task(parent_id, task_id).blocked = is_blocked
        return self.response()

    @bobo.post("/add_release", check=check)
    def add_release(self, name, description):
        self.kanban.new_release(name, description)
        return self.response()

    @bobo.post("/add_task", check=check)
    def add_task(self, name, description, parent_id):
        self.kanban.releases[parent_id].new_task(name, description)
        return self.response()

    @bobo.post("/edit_task",
               content_type='application/json',
               check=zc.asanakanban.auth.checker)
    def edit_task(self, id, name, description, parent_id=None):
        if parent_id:
            self.kanban.releases[parent_id].edit_task(is, name, description)
        else:
            self.kanban.releases[task_id].edit(name, description)
        return self.response()

    @bobo.post("/new-state", check=check)
    def new_state(self, new_state, task_ids, parent_id=None):
        if isinstance(task_ids, basestring):
            task_ids = task_ids,

        tasks = self.kanban.releases
        if parent_id:
            tasks = releases[parent_id]

        for task_id in task_ids:
            task = tasks[task_id]
            task.state = new_state
            tasks.add(task)

        return self.response()

    @bobo.query("/remove",
                content_type='application/json',
                check=zc.asanakanban.auth.checker)
    def remove(self, task_id):
        self.delete("tasks/%s" % task_id)
        parent = self.cache.delete(int(task_id))
        if parent:
            t = self.get_task(parent['id']);
            self.cache.invalidate(t)

    @bobo.post("/take",
               content_type='application/json',
               check=zc.asanakanban.auth.checker)
    def take(self, task_id):
        self.cache.invalidate(self.put("tasks/%s" % task_id, assignee = "me"))
