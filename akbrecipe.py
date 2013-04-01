import hashlib
import pprint
import zc.zk

class Recipe:

    def __init__(self, buildout, name, options):
        zk = zc.zk.ZK('zookeeper:2181')
        zk_options = zk.properties(
            '/' + name.replace(',', '/').rsplit('.', 1)[0])

        port = zk_options['port']

        buildout['deployment'] = dict(
            recipe = 'zc.recipe.deployment',
            name=name,
            user='zope',
            )

        buildout.parse("""
        [web]
        recipe = zc.zdaemonrecipe
        deployment = deployment
        d = ${buildout:directory}
        program = ${:d}/bin/bobo ${:d}/akb.py -p %(port)s
        zdaemon.conf =
           <runner>
              transcript ${deployment:log-directory}/web.log
           </runner>
        start-test-program = nc -z localhost %(port)s

        [rc]
        recipe = zc.recipe.rhrc
        deployment = deployment
        parts = web
        chkconfig = 345 99 10
        process-management = true
        digest = %(digest)s
        """ % dict(
            port=port,
            digest=hashlib.sha224(
                               pprint.pformat(dict(zk_options))).hexdigest()))

    install = update = lambda self: ()
