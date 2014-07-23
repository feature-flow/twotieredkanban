import bobo
import datetime
import gevent.queue
import json
import logging
import os
import persistent
import requests
import time
import zc.dojoform
import zc.generationalset
import webob

logger = logging.getLogger(__name__)

def check(self, request, func):
    return self.check(func)

def get(*args, **kw):
    return bobo.get(*args, check=check, **kw)

def post(*args, **kw):
    return bobo.post(*args, check=check, **kw)

def error(message):
    raise bobo.BoboException(
        403,
        json.dumps(dict(error=message)),
        content_type='application/json',
        )

def read_file(path):
    with open(os.path.join(os.path.dirname(__file__), path)) as f:
        return f.read()

clients = set()

class Encoder(json.JSONEncoder):

    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()[:19]
        return obj.json_reduce()

@bobo.subroute("", scan=True)
class API:

    def __init__(self, request):
        self.request = request
        self.connection = connection = request.environ['zodb.connection']
        email = request.remote_user
        if not email:
            self.error(401, "You must authenticate")
        self.root = root = connection.root
        self.kanban = root.kanban
        if not email in self.kanban.users:
            self.error(403, "You are not allowed to access this resource")
        self.email = email

    def error(self, status, body='', **kw):
        self.connection.transaction_manager.abort()
        raise bobo.BoboException(status, body, **kw)

    def response(self, **data):
        response = webob.Response(content_type="application/json")
        generation = self.request.headers.get('x-generation', 0)
        updates = self.kanban.releases.generational_updates(int(generation))
        if updates and len(updates) > 1:
            data['updates'] = updates
        response.body = json.dumps(data, cls=Encoder)
        response.cache_control = 'no-cache'
        response.pragma = 'no-cache'
        return response

    def check(self, func):
        if (getattr(func, 'admin', False) and
            self.user not in self.kanban.admins):
            self.error(403, "You must be an adminstrator")

    @get("/")
    def index_html():
        return read_file("kb.html")

    @get("/kb.js", content_type="application/javascript")
    def kb_js():
        return read_file("kb.js")

    @get("/kb.css", content_type="text/css")
    def kb_css():
        return read_file("kb.css")

    @get("/dojo/zc.dojo.js", content_type="application/javascript")
    def zc_dojo_js():
        return read_file(os.path.join(os.path.dirname(zc.dojoform.__file__),
                                      "resources/zc.dojo.js"))

    @get("/zc.dojo.css", content_type="text/css")
    def zc_dojo_css():
        return read_file(os.path.join(os.path.dirname(zc.dojoform.__file__),
                                      "resources/zc.dojo.css"))



    @get("/model.json")
    def model_json(self):
        return self.response(states=self.kanban.states)

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
    _task = _tasks

    @post("/blocked")
    def blocked(self, task_id, is_blocked, parent_id):
        self._task(parent_id, task_id).blocked = is_blocked
        return self.response()

    @post("/add_release")
    def add_release(self, name, description):
        self.kanban.new_release(name, description)
        return self.response()

    @post("/add_task")
    def add_task(self, name, description, parent_id):
        self.kanban.releases[parent_id].new_task(name, description)
        return self.response()

    @post("/edit_task")
    def edit_task(self, id, name, description, parent_id=None):
        if parent_id:
            self.kanban.releases[parent_id].edit_task(id, name, description)
        else:
            self.kanban.releases[task_id].edit(name, description)
        return self.response()

    @post("/new-state")
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

    @post("/remove")
    def remove(self, task_id):
        pass

    @post("/take")
    def take(self, task_id):
        pass
    
