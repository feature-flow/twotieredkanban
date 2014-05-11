import gevent.pywsgi
import geventwebsocket.handler

def runner(app, conf, host='', port=8080):
    gevent.pywsgi.WSGIServer(
        (host, int(port)), app,
        handler_class=geventwebsocket.handler.WebSocketHandler,
        ).serve_forever()
