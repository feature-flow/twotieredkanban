import bobo
import datetime
import json
import webob

from .invalidate import wait

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

class Encoder(json.JSONEncoder):

    def default(self, obj):
        if isinstance(obj, datetime.datetime):
            return obj.isoformat()[:19]
        return obj.json_reduce()

class Sync:

    def __init__(self, base, context):
        self.base = base
        self.context = context

    def _response(self, data=None):
        response = webob.Response(content_type="application/json")
        response.text = json.dumps(data, cls=Encoder) if data else '{}'
        response.cache_control = 'no-cache'
        response.pragma = 'no-cache'
        return response

    def response(self, **data):
        generation = int(self.base.request.headers.get('x-generation', 0))
        updates = self.context.updates(generation)
        if generation == 0:
            # first load, set uswer
            updates['user'] = self.base.user

        if updates:
            data['updates'] = updates
        return self._response(data)

    @get("/poll")
    def poll(self):
        return self.response()

    @get("/longpoll")
    def longpoll(self):
        generation = self.base.request.headers.get('x-generation', 0)
        updates = self.context.updates(int(generation))
        if updates:
            return self._response(dict(updates=updates))

        oid = self.context.changes._p_oid
        self.context._p_jar.close()

        wait(oid)
        return self._response()

