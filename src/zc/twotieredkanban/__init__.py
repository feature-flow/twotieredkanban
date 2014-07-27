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

def put(*args, **kw):
    return bobo.put(*args, check=check, **kw)

def delete(*args, **kw):
    return bobo.delete(*args, check=check, **kw)

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
        if ('admin' in func.__name__  and
            self.email not in self.kanban.admins):
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

    @get("/poll")
    def poll(self):
        return self.response()

    @put("/")
    def admin(self, users, admins):
        self.kanban.users = users
        self.kanban.admins = admins
        self.kanban.changed()
        return self.response()

    @put("/move")
    def move_releases(self, release_ids, state):
        for release_id in release_ids:
            self.update_release(release_id, state=state)
        return self.response()

    @post("/releases")
    def add_release(self, name, description):
        self.kanban.new_release(name, description)
        return self.response()

    @put("/releases/:release_id")
    def update_release(self, release_id,
                       name=None, description=None, state=None,
                       assigned=None, blocked=None,
                       ):
        self.kanban[release_id].update(
            name=name, description=description, state=state,
            assigned=assigned, blocked=blocked)
        return self.response()

    @delete("/releases/:release_id")
    def delete_release(self, request, release_id):
        self.kanban.archive(release_id)
        return self.response()

    @post("/releases/:release_id")
    def add_task(self, release_id, name, description):
        self.kanban[release_id].new_task(name, description)
        return self.response()

    @put("/releases/:release_id/tasks/:task_id")
    def update_task(self, release_id, task_id,
                       name=None, description=None, state=None,
                       assigned=None, blocked=None,
                       ):
        self.kanban[release_id].update_task(
            task_id, name=name, description=description,
            state=state, assigned=assigned, blocked=blocked)
        return self.response()

    @delete("/releases/:release_id/tasks/:task_id")
    def delete_task(self, request, release_id, task_id):
        self.kanban[release_id].archive(task_id)
        return self.response()

    @put("/releases/:release_id/move")
    def move_tasks(self, release_id, task_ids, state):
        for task_id in task_ids:
            self.update_task(release_id, task_id, state=state)
        return self.response()
