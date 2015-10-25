from zc.twotieredkanban.persona import Persona
from gevent.event import Event
import gevent.hub

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

    def error(self, status, body):
        self.connection.transaction_manager.abort()
        raise bobo.BoboException(status, body, "application/json")

    def response(self, **data):
        response = webob.Response(content_type="application/json")
        generation = self.request.headers.get('x-generation', 0)
        updates = self.kanban.updates(int(generation))
        if updates:
            data['updates'] = updates
        response.body = json.dumps(data, cls=Encoder)
        response.cache_control = 'no-cache'
        response.pragma = 'no-cache'
        return response

    def check(self, func):
        if not self.email:
            self.error(401, "You must authenticate")
        if self.email not in self.kanban.users:
            self.error(403,
                       dict(error="You're not authorized to use this Kanban.",
                            bad_user=True),
                       )
        if ('admin' in func.__name__  and self.email not in self.kanban.admins):
            self.error(403, dict(error="You must be an adminstrator"))

    @bobo.get("/")
    def index_html(self):
        return read_file("kb.html") % (
            json.dumps(self.email), json.dumps(self.email_hash(self.email)))

    @get("/poll")
    def poll(self):
        return self.response()

    @get("/longpoll")
    def longpoll(self):
        generation = self.request.headers.get('x-generation', 0)
        updates = self.kanban.updates(int(generation))
        if updates:
            return self.response()

        oid = self.kanban.tasks._p_oid
        self.connection.close()

        if oid not in waiting:
            waiting[oid] = []

        event = Event()
        waiting[oid].append(event)
        event.wait(300) # Timeout cuz client might have gone away
        try:
            waiting[oid].remove(event)
        except ValueError:
            pass

        response = webob.Response(content_type="application/json")
        response.body = '{}'
        response.cache_control = 'no-cache'
        response.pragma = 'no-cache'
        return response

    @put("/")
    def admin(self, users, admins):
        self.kanban.update(users, admins)
        return self.response()

    @post("/releases")
    def add_release(self, name, description):
        self.kanban.new_release(name, description)
        return self.response()

    @put("/releases/:release_id")
    def update_release(self, release_id, name=None, description=''):
        self.kanban.update_task(release_id, name, description)
        return self.response()

    @put("/move/:task_id")
    def move_release(self, task_id, state):
        self.kanban.transition(task_id, state)
        return self.response()

    @post("/releases/:release_id")
    def add_task(self, release_id, name, description='', size=1, blocked=None):
        self.kanban.new_task(release_id, name, description, size, blocked)
        return self.response()

    @put("/tasks/:task_id")
    def update_task(self, task_id,
                    name, description='', size=1, blocked=None, assigned=None,
                    ):
        self.kanban.update_task(
            task_id, name, description, size, blocked, assigned)
        return self.response()

    @delete("/tasks/:task_id")
    def delete_task(self, request, task_id):
        self.kanban.archive_task(task_id)
        return self.response()

def initialize_database(initial_email):
    def initialize(database):

        with database.transaction() as conn:
            if not hasattr(conn.root, 'kanban'):
                from zc.twotieredkanban.model import Kanban
                conn.root.kanban = Kanban(initial_email)
        zc.twotieredkanban.persona.initialize_database(database)

        orig_invalidate = database.invalidate
        def patched_invalidate(tid, oids, *a, **kw):
            orig_invalidate(tid, oids, *a, **kw)
            invalidated(oids)
        database.invalidate = patched_invalidate

    return initialize

async = gevent.hub.get_hub().loop.async()
def invalidated(oids):
    for oid in oids:
        events = waiting.get(oid)
        while events:
            events.pop().set()

    async.send()

waiting = {}
