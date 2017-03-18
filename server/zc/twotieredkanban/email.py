import contextlib
import pq
import psycopg2
import psycopg2transaction

dsn = None
def config(options):
    global dsn
    dsn = options['dsn']

def create_queue_table(dsn_=None):
    with contextlib.closing(psycopg2.connect(dsn_ or dsn)) as conn:
        pq.PQ(conn).create()
        with contextlib.closing(conn.cursor()) as cursor:
            cursor.execute("DROP FUNCTION public.pq_notify() CASCADE")
        conn.commit()

def send(trans, to, **kw):
    conn = psycopg2transaction.join(dsn, trans, notify='email')
    with contextlib.closing(conn.cursor()) as cursor:
        pq.Queue('email', cursor=cursor).put(dict(to=to, **kw))
