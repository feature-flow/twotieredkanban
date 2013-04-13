import bobo
import boboserver
import logging
import gevent.monkey
import gevent.pywsgi
import geventwebsocket.handler

gevent.monkey.patch_all()

logging.basicConfig()

gevent.pywsgi.WSGIServer(
    ("", 8000),
    boboserver.Reload(
        bobo.Application(bobo_resources='zc.asanakanban.akb'),
        {}, modules='zc.asanakanban.akb'),
    handler_class=geventwebsocket.handler.WebSocketHandler,
    ).serve_forever()
