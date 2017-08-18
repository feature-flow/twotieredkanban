from ubuntu:17.04

run locale-gen "en_US.UTF-8" ; \
    apt-get update ; \
    apt-get install -y \
      build-essential python3-dev python3-venv python-virtualenv npm \
      libevent-dev zlib1g-dev libpq-dev libssh-dev libffi-dev libbz2-dev

run python3 -m venv env ; \
    env/bin/pip install --upgrade pip zc.buildout jinja2==2.9.6

copy . /app/

run cd /app ; \
    /env/bin/buildout bootstrap; \
    npm set progress=false; \
    ln -s /usr/bin/nodejs /usr/bin/node; \
    bin/buildout -c docker/build.cfg

expose 8000
label maintainer="jim@jimfulton.info"
cmd /bin/sh /app/docker/start.sh
