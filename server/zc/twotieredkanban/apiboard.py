from .apiutil import get, post, put, delete
from .invalidate import wait

import bobo
import datetime
import json
import logging
import time
import webob

logger = logging.getLogger(__name__)

class Encoder(json.JSONEncoder):

    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()[:19]
        return obj.json_reduce()

@bobo.scan_class
class Board:

    def __init__(self, base, kanban):
        self.request = base.request
        self.kanban = kanban
        self.check = base.check

    def _response(self, data=None):
        response = webob.Response(content_type="application/json")
        response.text = data and json.dumps(data, cls=Encoder) or '{}'
        response.cache_control = 'no-cache'
        response.pragma = 'no-cache'
        return response

    def response(self, **data):
        generation = self.request.headers.get('x-generation', 0)
        updates = self.kanban.updates(int(generation))
        if updates:
            data['updates'] = updates
        return self._response(data)

    @get("/poll")
    def poll(self):
        return self.response()

    @get("/longpoll")
    def longpoll(self):
        generation = self.request.headers.get('x-generation', 0)
        updates = self.kanban.updates(int(generation))
        if updates:
            return self._response(dict(updates=updates))

        oid = self.kanban.tasks._p_oid
        self.kanban._p_jar.close()

        wait(oid)
        return self._response()

    @post("/releases")
    def add_release(self, name, description, order):
        self.kanban.new_release(name, description=description, order=order)
        return self.response()

    @put("/releases/:release_id")
    def update_release(self, release_id, name=None, description=''):
        self.kanban.update_task(release_id, name, description)
        return self.response()

    @put("/move/:task_id")
    def move(self, task_id, parent_id, state, order):
        self.kanban.transition(task_id, parent_id, state, order)
        return self.response()

    @post("/releases/:release_id")
    def add_task(self, release_id, name, order,
                 description='', size=1, blocked='', assigned=None):
        self.kanban.new_task(release_id, name, description=description,
                             size=size, blocked=blocked, order=order,
                             assigned=assigned)
        return self.response()

    @put("/tasks/:task_id")
    def update_task(self, task_id, name=None,
                    description=None, size=None, blocked=None, assigned=None,
                    ):
        self.kanban.update_task(
            task_id, name=name, description=description,
            size=size, blocked=blocked, assigned=assigned)
        return self.response()

    @delete("/tasks/:task_id")
    def delete_task(self, request, task_id):
        self.kanban.archive_task(task_id)
        return self.response()
