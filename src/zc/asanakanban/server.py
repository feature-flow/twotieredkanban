import bobo
import boboserver
import logging
import gevent.monkey
import gevent.pywsgi
import geventwebsocket.handler
import os
import sys

#gevent.monkey.patch_all()

logging.basicConfig()

resources = """
zc.asanakanban.akb
boboserver:static('/dojo', '%(here)s/dojo')
""" % dict(here = os.path.dirname(__file__))

def main(args=None):
    if args is None:
        args = sys.argv[1:]

    if args:
        [port] = args
    else:
        port = 8080

    gevent.pywsgi.WSGIServer(
        ("", int(port)),
        boboserver.Reload(
            bobo.Application(bobo_resources=resources),
            {}, modules='zc.asanakanban.akb'),
        handler_class=geventwebsocket.handler.WebSocketHandler,
        ).serve_forever()

