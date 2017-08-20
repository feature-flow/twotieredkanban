cd /app
bin/buildout -c docker/start.cfg install paste.ini dbclient
if [ -n "$DOMAIN" ]; then
    /app/bin/emailpw-bootstrap -t "$TITLE" -b "$BASE_URL" --env-config \
                               /app/db.cfg "$DOMAIN" "$EMAIL" "$NAME"
else
    /app/bin/run-wsgi /app/parts/paste.ini
fi
