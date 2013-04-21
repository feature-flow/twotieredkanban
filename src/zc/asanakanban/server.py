import bobo
import boboserver
import logging
import gevent.monkey
import gevent.pywsgi
import geventwebsocket.handler
import os

gevent.monkey.patch_all()

logging.basicConfig()

resources = """
zc.asanakanban.akb
boboserver:static('/dojo', '%(here)s/dojo')
""" % dict(here = os.path.dirname(__file__))

gevent.pywsgi.WSGIServer(
    ("", 8080),
    boboserver.Reload(
        bobo.Application(bobo_resources=resources),
        {}, modules='zc.asanakanban.akb'),
    handler_class=geventwebsocket.handler.WebSocketHandler,
    ).serve_forever()
