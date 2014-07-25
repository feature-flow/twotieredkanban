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

Adding users
============

    >>> pprint(post(admin, '/users', dict(email='user1@example.com')).json)
    {u'updates': {u'adds': [{u'admins': [u'admin@example.com'],
                             u'id': u'',
                             u'users': [u'admin@example.com',
                                        u'user1@example.com']}],
                  u'generation': 3}}

    >>> pprint(post(admin, '/users',
    ...     dict(email=['user2@example.com', 'user3@example.com'])).json)
    {u'updates': {u'adds': [{u'admins': [u'admin@example.com'],
                             u'id': u'',
                             u'users': [u'admin@example.com',
                                        u'user1@example.com',
                                        u'user2@example.com',
                                        u'user3@example.com']}],
                  u'generation': 4}}
