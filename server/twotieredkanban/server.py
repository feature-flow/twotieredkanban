import gevent.pywsgi

def runner(app, conf, host='', port=8080):
    gevent.pywsgi.WSGIServer((host, int(port)), app).serve_forever()
