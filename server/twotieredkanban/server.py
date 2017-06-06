import collections
from contextlib import closing
import gevent.event
import gevent.monkey
import gevent.pywsgi
import logging
import psycogreen.gevent
import newt.db.follow
from newt.db import pg_connection
import sys
from ZODB.utils import p64

gevent.monkey.patch_all()
psycogreen.gevent.patch_psycopg()

logger = logging.getLogger(__name__)

def runner(app, conf, dsn, host='', port=8080):
    @gevent.spawn
    def handle_updates():
        try:
            for zoid in updates(dsn):
                for e in pollers.pop(zoid, ()):
                    e.set()
        except Exception:
            logger.critical("Change poll loop failed", exc_info=True)
            sys.exit(1)

    db = app.database
    def polling_app(environ, start_response):
        # If we're sitting behind an elb providing HTTPS:
        forwarded_proto = environ.get('HTTP_X_FORWARDED_PROTO')
        if forwarded_proto:
            environ['wsgi.url_scheme'] = forwarded_proto

        path = environ['PATH_INFO']
        if path.endswith('/longpoll'):
            client_gen = int(environ.get('HTTP_X_GENERATION', 0))
            if client_gen:
                zoid = int(environ['HTTP_X_GENERATION_ZOID'])
                event = gevent.event.Event()
                pollers[zoid].append(event)
                with db.transaction() as conn:
                    gen = conn.get(p64(zoid)).generation

                if gen <= client_gen:
                    # Wait for updates
                    event.wait(300)
                else:
                    try:
                        pollers[zoid].remove(event)
                    except IndexError:
                        pass

        return app(environ, start_response)

    gevent.pywsgi.WSGIServer((host, int(port)), polling_app).serve_forever()

pollers = collections.defaultdict(list) # {zoid -> [events]}

def updates(dsn):
    with closing(pg_connection(dsn)) as conn:
        with closing(conn.cursor()) as cursor:
            cursor.execute("select max(tid) from object_state")
            [[tid]] = cursor
            cursor.execute("""prepare get_updates(bigint) as
            select max(tid) over(), zoid
            from object_state join newt using(zoid)
            where class_name = 'zc.generationalset.GenerationalSet'
              and tid > $1
            """)
            for _ in newt.db.follow.listen(dsn, True):
                cursor.execute("execute get_updates(%s)", (tid,))
                for tid, zoid in cursor:
                    yield zoid
