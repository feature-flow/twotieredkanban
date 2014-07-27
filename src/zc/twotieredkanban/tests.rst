===========================
Basic two-tier kanban tests
===========================

When using two-tiered kanban, there is some basic setup you need to do first.

You need to create a database root object named 'kanban'

    >>> import zc.twotieredkanban.model
    >>> with conn.transaction_manager:
    ...     conn.root.kanban = zc.twotieredkanban.model.Kanban(
    ...         'admin@example.com')

When we create a kanban object, we need to pass in an initial admin
email.  Emails are used to *authorize* access. Persona,
https://login.persona.org/about, is used to *authenticate* emails.

The web server has some boring URLs to loading pages. We'll glos over
these except to point out that pages need to be authenticated:

    >>> _ = test_app().get('/model.json', status=401)

    >>> admin = test_app('admin@example.com')
    >>> pprint(admin.get('/model.json').json)
    {u'states': [{u'label': u'Ready', u'tag': u'ready'},
                 {u'label': u'Development',
                  u'substates': [{u'label': u'Ready', u'tag': u'ready'},
                                 {u'label': u'Doing',
                                  u'tag': u'doing',
                                  u'working': True},
                                 {u'label': u'Needs Review',
                                  u'tag': u'needs review'},
                                 {u'label': u'Review',
                                  u'tag': u'review',
                                  u'working': True},
                                 {u'label': u'Done', u'tag': u'done'},
                                 {u'label': u'Deployed', u'tag': u'deployed'}],
                  u'tag': u'development'},
                 {u'label': u'Deploy', u'tag': u'deploy'},
                 {u'label': u'Deployed', u'tag': u'deployed'}],
     u'updates': {u'adds': [{u'admins': [u'admin@example.com'],
                             u'id': u'',
                             u'users': [u'admin@example.com']}],
                  u'generation': 2}}

We can adjust the model, but that's a different story.

We get a model description. We also got an update for the kanban.  We
didn't send any generational information, so we got all updates since
generation 0.  We can also poll for updates.  This time, we're going
to invoke the request a little differently using a test helper that
keeps track of generations the way an app would, by sending an
X-Generation header with the last generation it got.

    >>> pprint(get(admin, '/poll').json)
    {u'updates': {u'adds': [{u'admins': [u'admin@example.com'],
                             u'id': u'',
                             u'users': [u'admin@example.com']}],
                  u'generation': 2}}


If we call it again, there won't be any updates:

    >>> pprint(get(admin, '/poll').json)
    {}

Updating users
==============

To update users, simply replace the users and admin lists by putting
to ``/``:

    >>> pprint(put(admin, '/', dict(
    ...     users=['admin@example.com', 'helper@foo.com',
    ...            'user1@foo.com', 'user2@example.com'],
    ...     admins=['admin@example.com', 'helper@foo.com'],
    ...     )).json)
    {u'updates': {u'adds': [{u'admins': [u'admin@example.com',
                                         u'helper@foo.com'],
                             u'id': u'',
                             u'users': [u'admin@example.com',
                                        u'helper@foo.com',
                                        u'user1@foo.com',
                                        u'user2@example.com']}],
                  u'generation': 3}}

Ordinary users can't manage users:

    >>> user = test_app('user1@foo.com')
    >>> _ = get(user, '/poll')
    >>> put(user, '/', dict(users=[], admins=['user1@foo.com']), status=403)
    <403 Forbidden text/html body='You must ...ator'/27>

But ordinary users can do everythig else.

Creating releases
=================

    >>> pprint(post(user, '/releases',
    ...              dict(name='kanban', description='Build the kanban')).json)
    {u'updates': {u'adds': [{u'adds': [{u'assigned': None,
                                    u'blocked': u'',
                                    u'created': 1406405514,
                                    u'description': u'Build the kanban',
                                    u'id': u'00000000000000000000000000000001',
                                    u'name': u'kanban',
                                    u'state': u'ready'}],
                         u'id': u'00000000000000000000000000000001'}],
                  u'generation': 4}}


Creating tasks
==============

    >>> release_id = u'00000000000000000000000000000001'
    >>> pprint(post(user, '/releases/' + release_id,
    ...        dict(name='backend', description='Create backend')).json)
    {u'updates': {u'adds': [{u'adds': [{u'assigned': None,
                                    u'blocked': u'',
                                    u'created': 1406405514,
                                    u'description': u'Create backend',
                                    u'id': u'00000000000000000000000000000002',
                                    u'name': u'backend',
                                    u'state': None}],
                         u'id': u'00000000000000000000000000000001'}],
              u'generation': 5}}

Updating releases and tasks
===========================

    >>> pprint(put(user, '/releases/' + release_id,
    ...            dict(state='development')).json)
    {u'updates': {u'adds': [{u'adds': [{u'assigned': None,
                                    u'blocked': u'',
                                    u'created': 1406405514,
                                    u'description': u'Build the kanban',
                                    u'id': u'00000000000000000000000000000001',
                                    u'name': u'kanban',
                                    u'state': u'development'},
                                   {u'assigned': None,
                                    u'blocked': u'',
                                    u'created': 1406405514,
                                    u'description': u'Create backend',
                                    u'id': u'00000000000000000000000000000002',
                                    u'name': u'backend',
                                    u'state': u'ready'}],
                             u'id': u'00000000000000000000000000000001'}],
                  u'generation': 7}}

    >>> task_id = u'00000000000000000000000000000002'
    >>> pprint(put(user, '/releases/' + release_id + '/tasks/' + task_id,
    ...            dict(state='doing', assigned='user2@example.com')).json)
    {u'updates': {u'adds': [{u'adds': [{u'assigned': u'user2@example.com',
                                    u'blocked': u'',
                                    u'created': 1406405514,
                                    u'description': u'Create backend',
                                    u'id': u'00000000000000000000000000000002',
                                    u'name': u'backend',
                                    u'state': u'doing'}],
                             u'id': u'00000000000000000000000000000001'}],
                  u'generation': 8}}

Deleting tasks and releases
===========================

We can delete tasks and releases. When we do, they are archived.

    >>> pprint(
    ...     delete(user, '/releases/' + release_id + '/tasks/' + task_id).json)
    {u'updates': {u'adds': [{u'id': u'00000000000000000000000000000001',
                         u'removals': [u'00000000000000000000000000000002']}],
                  u'generation': 9}}

    >>> conn.sync()
    >>> kanban = conn.root.kanban
    >>> release = kanban[release_id]
    >>> list(release.tasks) == [release]
    True
    >>> [task_id] == [task.id for task in release.archived]
    True

    >>> pprint(
    ...     delete(user, '/releases/' + release_id).json)
    {u'updates': {u'generation': 10,
                  u'removals': [u'00000000000000000000000000000001']}}

    >>> conn.sync()
    >>> list(kanban.releases) == [kanban]
    True
    >>> [release_id] == list(conn.root.kanban.archived)
    True


