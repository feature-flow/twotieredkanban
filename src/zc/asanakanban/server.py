import bobo
import boboserver
import logging
import gevent.monkey
import gevent.pywsgi
import geventwebsocket.handler

gevent.monkey.patch_all()

logging.basicConfig()

resources = """
zc.asanakanban.akb
"""

gevent.pywsgi.WSGIServer(
    ("", 8080),
    boboserver.Reload(
        bobo.Application(bobo_resources=resources),
        {}, modules='zc.asanakanban.akb'),
    handler_class=geventwebsocket.handler.WebSocketHandler,
    ).serve_forever()
