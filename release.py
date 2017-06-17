# Quick and dirty script to make releases.  Generally modeled on
# zest.release, but far less ambitious.
import datetime
import os

with open('CHANGES.rst') as f:
    changes = f.read()

before, after = changes.split('(unreleased)')
before, version = before.rsplit('\n', 1)
version = version.strip()

M, m, p = map(int, version.split('.'))

changes = before + ("""
%d.%d.%d (unreleased)
=====================

Nothing changed yet

%s (%s)""" % (M, m, p+1, version, datetime.date.today().isoformat())
                    ) + after

with open('release.cfg', 'w') as f:
    f.write("[buildout]\nrelease = %r\n" % version)
with open('client/version.js', 'w') as f:
    f.write("module.exports = %r;\n" % version)

with open('CHANGES.rst', 'w') as f:
    f.write(changes)

if not os.system("git commit -am 'Releasing %s'" % version):
    if not os.system("git tag '%s'" % version):
        os.system("git push")
