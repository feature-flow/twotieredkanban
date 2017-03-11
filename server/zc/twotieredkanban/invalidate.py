"""Invalidate clients when a board has changed
"""
from gevent.event import Event

import gevent.hub

def patch_db(database):
    return
    orig_invalidate = database.invalidate
    def patched_invalidate(tid, oids, *a, **kw):
        orig_invalidate(tid, oids, *a, **kw)
        invalidated(oids)
    database.invalidate = patched_invalidate

async = gevent.hub.get_hub().loop.async()
def invalidated(oids):
    for oid in oids:
        events = waiting.get(oid)
        while events:
            events.pop().set()

    async.send()

waiting = {}

def wait(oid):
    if oid not in waiting:
        waiting[oid] = []

    event = Event()
    waiting[oid].append(event)
    event.wait(300) # Timeout cuz client might have gone away
    try:
        waiting[oid].remove(event)
    except ValueError:
        pass
