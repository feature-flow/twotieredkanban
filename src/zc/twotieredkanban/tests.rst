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

    >>> app = test_app()
    >>> _ = app.get('/model.json', status=401)

    >>> app = test_app('admin@example.com')
    >>> pprint(app.get('/model.json').json)

