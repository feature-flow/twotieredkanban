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

Requests that retrieve data are authenticated:

    >>> _ = test_app().get('/poll', status=401)

    >>> admin = test_app('admin@example.com')
    >>> pprint(admin.get('/poll').json)
    {u'updates': {u'generation': 15,
                  u'kanban': {u'admins': [u'admin@example.com'],
                              u'users': [u'admin@example.com']},
                  u'states': {u'adds': [{u'complete': False,
                  ...
                  u'tasks': {}}}


This time, we're going to invoke the request a little differently
using a test helper that keeps track of generations the way an app
would, by sending an X-Generation header with the last generation it
got.

    >>> data = get(admin, '/poll').json
    >>> pprint(data)
    {u'updates': {u'generation': 15,
                  u'kanban': {u'admins': [u'admin@example.com'],
                              u'users': [u'admin@example.com']},
                  u'states': {u'adds':
                      [{u'complete': False,
                        u'id': u'00000000000000000000000000000001',
                        u'label': u'Backlog',
                        u'order': 0,
                        u'parent': None,
                        u'working': False},
                       {u'complete': False,
                        u'id': u'00000000000000000000000000000002',
                        u'label': u'Ready',
                        u'order': 1048576,
                        u'parent': None,
                        u'working': False},
                       {u'complete': False,
                        u'id': u'00000000000000000000000000000003',
                        u'label': u'Development',
                        u'order': 2097152,
                        u'parent': None,
                        u'working': False},
                       {u'complete': False,
                        u'id': u'00000000000000000000000000000004',
                        u'label': u'Acceptance',
                        u'order': 3145728,
                        u'parent': None,
                        u'working': False},
                       {u'complete': False,
                        u'id': u'00000000000000000000000000000005',
                        u'label': u'Deploying',
                        u'order': 4194304,
                        u'parent': None,
                        u'working': False},
                       {u'complete': False,
                        u'id': u'00000000000000000000000000000006',
                        u'label': u'Deployed',
                        u'order': 5242880,
                        u'parent': None,
                        u'working': False},
                       {u'complete': False,
                        u'id': u'00000000000000000000000000000007',
                        u'label': u'Ready',
                        u'order': 6291456,
                        u'parent': u'development',
                        u'working': False},
                       {u'complete': False,
                        u'id': u'00000000000000000000000000000008',
                        u'label': u'Doing',
                        u'order': 7340032,
                        u'parent': u'development',
                        u'working': True},
                       {u'complete': False,
                        u'id': u'00000000000000000000000000000009',
                        u'label': u'Needs review',
                        u'order': 8388608,
                        u'parent': u'development',
                        u'working': False},
                       {u'complete': False,
                        u'id': u'00000000000000000000000000000010',
                        u'label': u'Review',
                        u'order': 9437184,
                        u'parent': u'development',
                        u'working': True},
                       {u'complete': True,
                        u'id': u'00000000000000000000000000000011',
                        u'label': u'Done',
                        u'order': 10485760,
                        u'parent': u'development',
                        u'working': False}]},
                  u'tasks': {}}}

    >>> states = dict((state['label'], state['id'])
    ...               for state in data['updates']['states']['adds'])


If we call it again, there won't be any updates:

    >>> pprint(get(admin, '/poll').json)
    {}

The initial outout above send the state model to the client. The state
model can be changed over time and clients will receive updates.

Updating users
==============

To update users, simply replace the users and admin lists by putting
to ``/``:

    >>> pprint(put(admin, '/', dict(
    ...     users=['admin@example.com', 'helper@foo.com',
    ...            'user1@foo.com', 'user2@example.com'],
    ...     admins=['admin@example.com', 'helper@foo.com'],
    ...     )).json)
    {u'updates': {u'generation': 16,
                  u'kanban': {u'admins': [u'admin@example.com',
                                          u'helper@foo.com'],
                              u'users': [u'admin@example.com',
                                         u'helper@foo.com',
                                         u'user1@foo.com',
                                         u'user2@example.com']}}}

Ordinary users can't manage users:

    >>> user = test_app('user1@foo.com')
    >>> _ = get(user, '/poll')
    >>> put(user, '/', dict(users=[], admins=['user1@foo.com']), status=403)
    <403 Forbidden ...>

But ordinary users can do everythig else.

Creating releases
=================

    >>> data = post(user, '/releases',
    ...             dict(name='kanban', description='Build the kanban')).json
    >>> pprint(data)
    {u'updates': {u'generation': 17,
                  u'tasks': {u'adds':
                    [{u'description': u'Build the kanban',
                      u'id': u'00000000000000000000000000000012',
                      u'name': u'kanban',
                      u'state': None}]}}}

Creating tasks
==============

    >>> release_id = data['updates']['tasks']['adds'][0]['id']
    >>> data = post(user, '/releases/' + release_id,
    ...        dict(name='backend', description='Create backend')).json
    >>> pprint(data)
    {u'updates': {u'generation': 18,
                  u'tasks': {u'adds':
                      [{u'assigned': None,
                        u'blocked': None,
                        u'created': 1406405514,
                        u'description': u'Create backend',
                        u'id': u'00000000000000000000000000000013',
                        u'name': u'backend',
                        u'parent': u'00000000000000000000000000000012',
                        u'size': 1,
                        u'state': None}]}}}
    >>> task_id = data['updates']['tasks']['adds'][0]['id']


Updating releases and tasks
===========================

    >>> pprint(put(user, '/releases/' + release_id,
    ...            dict(name='kanban development')).json)
    {u'updates': {u'generation': 19,
              u'tasks': {u'adds': [{u'description': u'',
                                    u'id': u'00000000000000000000000000000012',
                                    u'name': u'kanban development',
                                    u'state': None}]}}}

    >>> pprint(put(user, '/tasks/' + task_id,
    ...            dict(assigned='user2@example.com',
    ...                 name='backend')).json)
    {u'updates': {u'generation': 20,
          u'tasks': {u'adds': [{u'assigned': u'user2@example.com',
                                u'blocked': None,
                                u'created': 1406405514,
                                u'description': u'',
                                u'id': u'00000000000000000000000000000013',
                                u'name': u'backend',
                                u'parent': u'00000000000000000000000000000012',
                                u'size': 1,
                                u'state': None}]}}}


Moves
=====

In the kanban, a user can select tasks or releases and move
them (change state), and we supply a specialize interface to
support this.

    >>> data = put(user, '/move/' + task_id,
    ...            dict(state=states['Needs review'])).json
    >>> pprint(data)
    {u'updates': {u'generation': 21,
        u'tasks': {u'adds': [{u'assigned': u'user2@example.com',
                              u'blocked': None,
                              u'created': 1406405514,
                              u'description': u'',
                              u'id': u'00000000000000000000000000000013',
                              u'name': u'backend',
                              u'parent': u'00000000000000000000000000000012',
                              u'size': 1,
                              u'state': u'00000000000000000000000000000009'}]}}}
    >>> data['updates']['tasks']['adds'][0]['state'] == states['Needs review']
    True

    >>> data = put(user, '/move/' + release_id,
    ...            dict(state=states['Deploying'])).json
    >>> pprint(data)
    {u'updates': {u'generation': 22,
        u'tasks': {u'adds': [{u'description': u'',
                              u'id': u'00000000000000000000000000000012',
                              u'name': u'kanban development',
                              u'state': u'00000000000000000000000000000005'}]}}}
    >>> data['updates']['tasks']['adds'][0]['state'] == states['Deploying']
    True

Deleting tasks and releases
===========================

We can delete tasks and releases. When we do, they are archived.

    >>> conn.sync()
    >>> kanban = conn.root.kanban
    >>> release = kanban.tasks[release_id]
    >>> task = kanban.tasks[task_id]

    >>> pprint(delete(user, '/tasks/' + task_id).json)
    {u'updates': {u'generation': 23,
              u'tasks': {u'removals': [u'00000000000000000000000000000013']}}}


    >>> conn.sync()
    >>> list(release.archive) == [task]
    True

    >>> pprint(delete(user, '/tasks/' + release_id).json)
    {u'updates': {u'generation': 24,
              u'tasks': {u'removals': [u'00000000000000000000000000000012']}}}

    >>> conn.sync()
    >>> list(kanban.tasks) == []
    True
    >>> kanban.archive[release_id] == release
    True

