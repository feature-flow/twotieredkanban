from contextlib import closing
import os
import re

from newt.db import pg_connection
import newt.qbe

here = os.path.dirname(__file__)
evolver = re.compile(r'evolve(\d+)$').match

def evolve(dsn):
    with closing(pg_connection(dsn)) as conn:
        with closing(conn.cursor()) as cursor:
            try:
                with conn:
                    cursor.execute("select version from ff_schema_version")
                    [[version]] = cursor
            except Exception:
                with conn:
                    cursor.execute("""
                    create table ff_schema_version(version int);
                    insert into ff_schema_version values(0)
                    """)
                version = 0

            for v, name, ob in sorted((int(evolver(name).group(1)), name, ob)
                                      for (name, ob) in globals().items()
                                      if evolver(name)):
                if v > version:
                    print(name)
                    with conn:
                        if isinstance(ob, str):
                            if ' ' not in ob:
                                with open(os.path.join(here, ob)) as f:
                                    ob = f.read()
                            cursor.execute(ob)
                        else:
                            ob(conn, cursor)
                        cursor.execute(
                            "update ff_schema_version set version = %s",
                            (v,))

evolve1 = 'evolve1.sql'


qbe = newt.qbe.QBE()

qbe['text'] = newt.qbe.fulltext("extract_text(class_name, state)", "english")
qbe['archived'] = newt.qbe.scalar("state -> 'history' -> -1 ->> 'archived'")
qbe['modified'] = newt.qbe.scalar("state -> 'history' -> -1 ->> 'start'")
