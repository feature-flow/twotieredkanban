from zc.twotieredkanban.persona import Persona
import bobo
import datetime
import json
import logging
import os
import persistent
import time
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
class API(Persona):

    email = ''

    def __init__(self, request):
        super(API, self).__init__(request)
        self.kanban = self.root.kanban

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
        if not self.email:
            self.error(401, "You must authenticate")
        return
        if email not in self.kanban.users:
            self.error(403, "You're not authorized to use this Kanban.")
        if ('admin' in func.__name__  and
            self.email not in self.kanban.admins):
            self.error(403, "You must be an adminstrator")

    @bobo.get("/")
    def index_html(self):
        return read_file("kb.html") % (
            json.dumps(self.email), json.dumps(self.email_hash(self.email)))

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
                       assignee=None, blocked=None,
                       ):
        self.kanban[release_id].update(
            name=name, description=description, state=state,
            assignee=assignee, blocked=blocked)
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
                    assignee=None, blocked=None, size=None,
                    ):
        self.kanban[release_id].update_task(
            task_id, name=name, description=description,
            state=state, assignee=assignee, blocked=blocked,
            size=int(size) if size is not None else None,
            )
        return self.response()

    @delete("/releases/:release_id/tasks/:task_id")
    def delete_task(self, request, release_id, task_id):
        self.kanban[release_id].archive(task_id)
        return self.response()

    @put("/releases/:release_id/move")
    def move_tasks(self, release_id, task_ids, state):
        for task_id in task_ids:
            data = dict(state=state)
            if state in self.kanban.working_states:
                data['assignee'] = self.email
            self.update_task(release_id, task_id, **data)
        return self.response()

def initialize_database(initial_email):
    def initialize(database):
        with database.transaction() as conn:
            if not hasattr(conn.root, 'kanban'):
                from zc.twotieredkanban.model import Kanban
                conn.root.kanban = Kanban(initial_email)
        zc.twotieredkanban.persona.initialize_database(database)

    return initialize
