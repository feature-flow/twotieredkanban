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
        [paste.ini]
        recipe = zc.recipe.deployment:configuration
        dojo = ${buildout:parts-directory}/dojo
        text =
          [app:main]
          use = egg:bobo
          bobo_configure = zc.asanakanban.akb:config
                           zc.asanakanban.auth:config
          bobo_resources = zc.asanakanban.akb
                           zc.asanakanban.auth
                           boboserver:static('/dojo', '${:dojo}')
          api = ${:key}
          url = http://kanban.nova.aws.zope.net

          filter-with = reload

          [filter:reload]
          use = egg:bobo#reload
          modules = zc.asanakanban.akb

          filter-with = browserid

          [filter:browserid]
          use = egg:zc.wsgisessions
          db-name =

          filter-with = zodb

          [filter:zodb]
          use = egg:zc.zodbwsgi
          filter-with = debug
          configuration =
            <zodb>
               <mappingstorage>
               </mappingstorage>
            </zodb>

          initializer = zc.asanakanban.auth:db_init

          [filter:debug]
          use = egg:bobo#debug

          [server:main]
          use = egg:zc.asanakanban
          port = %(port)s

        [web]
        recipe = zc.zdaemonrecipe
        deployment = deployment
        program = ${buildout:bin-directory}/paster serve ${paste.ini:location}
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
        """ % dict(port=port,
                   digest=hashlib.sha224(
                       pprint.pformat(dict(zk_options))).hexdigest()))

    install = update = lambda self: ()
