from ubuntu:17.04

run apt-get clean && apt-get update && apt-get install -y locales; \
    locale-gen "en_US.UTF-8" ; \
    apt-get install -y \
      build-essential python3-dev python3-venv python-virtualenv npm \
      libevent-dev zlib1g-dev libpq-dev libssh-dev libffi-dev libbz2-dev

run python3 -m venv --without-pip env

copy . /app/

run cd /app ; \
    /env/bin/python bootstrap.py; \
    npm set progress=false; \
    ln -s /usr/bin/nodejs /usr/bin/node; \
    bin/buildout -c docker/build.cfg

expose 8000
label maintainer="jim@jimfulton.info"
cmd /bin/sh /app/docker/start.sh
