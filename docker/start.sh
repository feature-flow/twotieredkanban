cd /app
bin/buildout -c docker/start.cfg install paste.ini
/app/bin/run-wsgi /app/parts/paste.ini
