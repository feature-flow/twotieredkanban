===========================
Basic two-tier kanban tests
===========================

Emails are used to *authorize* access. Persona,
https://login.persona.org/about, is used to *authenticate* emails.

Requests that retrieve data are authenticated:

    >>> _ = test_app().get('/kb-boards', status=401)
    >>> admin = test_app('admin@example.com')

Initially, there aren't any boards. So we'll create one:

    >>> admin.get('/kb-boards').json
    {'boards': []}
    >>> admin.post_json('/kb-admin/boards', dict(name='test'))
    <200 OK text/html body=b'OK'>
    >>> admin.get('/kb-boards').json
    {'boards': ['test']}

Ordinary users can get and update board data. Let's create one.

    >>> pprint(admin.get('/kb-admin/users').json)
    {'admins': ['admin@example.com'], 'users': ['admin@example.com']}

    >>> admin.put_json(
    ...     '/kb-admin/users',
    ...     {'admins': ['admin@example.com'],
    ...      'users': ['admin@example.com', 'user@example.com']})
    <200 OK text/html body=b'OK'>

    >>> user = test_app('user@example.com')

Users can't manage users:

    >>> user.get('/kb-admin/users', status=403)
    <403 Forbidden ...>

When accessing boards, we get data via generational updates. We'll use
a helper function to automate looking at these.

    >>> import json
    >>> def updates(data):
    ...     data = data.json
    ...     if len(data) != 1:
    ...         print("extra data")
    ...     data = data["updates"]
    ...     print(json.dumps(data, sort_keys=True, indent=2))
    ...     return data

Now, we'll access the test board we created:

    >>> data = updates(get(user, '/board/test/poll'))
    {
      "generation": 12,
      "states": {
        "adds": [
          {
            "complete": false,
            "id": "00000000000000000000000000000001",
            "label": "Backlog",
            "order": 0,
            "parent": null,
            "working": false
          },
          {
            "complete": false,
            "id": "00000000000000000000000000000002",
            "label": "Ready",
            "order": 1048576,
            "parent": null,
            "working": false
          },
          {
            "complete": false,
            "id": "00000000000000000000000000000003",
            "label": "Development",
            "order": 2097152,
            "parent": null,
            "working": false
          },
          {
            "complete": false,
            "id": "00000000000000000000000000000004",
            "label": "Ready",
            "order": 2097152,
            "parent": "00000000000000000000000000000003",
            "working": false
          },
          {
            "complete": false,
            "id": "00000000000000000000000000000005",
            "label": "Doing",
            "order": 2097152,
            "parent": "00000000000000000000000000000003",
            "working": true
          },
          {
            "complete": false,
            "id": "00000000000000000000000000000006",
            "label": "Needs review",
            "order": 2097152,
            "parent": "00000000000000000000000000000003",
            "working": false
          },
          {
            "complete": false,
            "id": "00000000000000000000000000000007",
            "label": "Review",
            "order": 2097152,
            "parent": "00000000000000000000000000000003",
            "working": true
          },
          {
            "complete": true,
            "id": "00000000000000000000000000000008",
            "label": "Done",
            "order": 2097152,
            "parent": "00000000000000000000000000000003",
            "working": false
          },
          {
            "complete": false,
            "id": "00000000000000000000000000000009",
            "label": "Acceptance",
            "order": 3145728,
            "parent": null,
            "working": false
          },
          {
            "complete": false,
            "id": "00000000000000000000000000000010",
            "label": "Deploying",
            "order": 4194304,
            "parent": null,
            "working": false
          },
          {
            "complete": false,
            "id": "00000000000000000000000000000011",
            "label": "Deployed",
            "order": 5242880,
            "parent": null,
            "working": false
          }
        ]
      }
    }

    >>> states = dict((state['label'], state['id'])
    ...               for state in data['states']['adds'])


If we call it again, there won't be any updates:

    >>> pprint(get(user, '/board/test/poll').json)
    {}

The initial outout above send the state model to the client. The state
model can be changed over time and clients will receive updates.

Creating releases
=================

    >>> data = updates(post(user, '/board/test/releases',
    ...        dict(name='kanban', description='Build the kanban', order=0.0)))
    {
      "generation": 13,
      "tasks": {
        "adds": [
          {
            "assigned": null,
            "blocked": null,
            "complete": null,
            "created": 1406405514,
            "description": "Build the kanban",
            "id": "00000000000000000000000000000012",
            "name": "kanban",
            "order": 0.0,
            "parent": null,
            "size": 1,
            "state": null
          }
        ]
      }
    }

Creating tasks
==============

    >>> release_id = data['tasks']['adds'][0]['id']
    >>> data = updates(post(user, '/board/test/releases/' + release_id,
    ...         dict(name='backend', description='Create backend', order=1.0)))
    {
      "generation": 14,
      "tasks": {
        "adds": [
          {
            "assigned": null,
            "blocked": "",
            "complete": null,
            "created": 1406405514,
            "description": "Create backend",
            "id": "00000000000000000000000000000013",
            "name": "backend",
            "order": 1.0,
            "parent": "00000000000000000000000000000012",
            "size": 1,
            "state": null
          }
        ]
      }
    }
    >>> task_id = data['tasks']['adds'][0]['id']
    >>> parent_id = data['tasks']['adds'][0]['parent']


Updating releases and tasks
===========================

    >>> _ = updates(put(user, '/board/test/releases/' + release_id,
    ...           dict(name='kanban development')))
    {
      "generation": 15,
      "tasks": {
        "adds": [
          {
            "assigned": null,
            "blocked": null,
            "complete": null,
            "created": 1406405514,
            "description": "",
            "id": "00000000000000000000000000000012",
            "name": "kanban development",
            "order": 0.0,
            "parent": null,
            "size": 1,
            "state": null
          }
        ]
      }
    }

    >>> _ = updates(put(user, '/board/test/tasks/' + task_id,
    ...            dict(assigned='user2@example.com',
    ...                 name='backend')))
    {
      "generation": 16,
      "tasks": {
        "adds": [
          {
            "assigned": "user2@example.com",
            "blocked": "",
            "complete": null,
            "created": 1406405514,
            "description": "Create backend",
            "id": "00000000000000000000000000000013",
            "name": "backend",
            "order": 1.0,
            "parent": "00000000000000000000000000000012",
            "size": 1,
            "state": null
          }
        ]
      }
    }


Moves
=====

In the kanban, a user can select tasks or releases and move
them (change state), and we supply a specialize interface to
support this.

    >>> data = updates(put(user, '/board/test/move/' + task_id,
    ...          dict(state=states['Done'], order=3.0, parent_id=parent_id)))
    {
      "generation": 17,
      "tasks": {
        "adds": [
          {
            "assigned": "user2@example.com",
            "blocked": "",
            "complete": 1406405514,
            "created": 1406405514,
            "description": "Create backend",
            "id": "00000000000000000000000000000013",
            "name": "backend",
            "order": 3.0,
            "parent": "00000000000000000000000000000012",
            "size": 1,
            "state": "00000000000000000000000000000008"
          }
        ]
      }
    }
    >>> data['tasks']['adds'][0]['state'] == states['Done']
    True

Note that because the task reached the Done state, it was markec
complete with the current time.

    >>> data = updates(put(user, '/board/test/move/' + release_id,
    ...            dict(state=states['Deploying'], parent_id=None, order=4.0)))
    {
      "generation": 18,
      "tasks": {
        "adds": [
          {
            "assigned": null,
            "blocked": null,
            "complete": null,
            "created": 1406405514,
            "description": "",
            "id": "00000000000000000000000000000012",
            "name": "kanban development",
            "order": 4.0,
            "parent": null,
            "size": 1,
            "state": "00000000000000000000000000000010"
          }
        ]
      }
    }
    >>> data['tasks']['adds'][0]['state'] == states['Deploying']
    True

Deleting tasks and releases
===========================

We can delete tasks and releases. When we do, they are archived.

    >>> conn.sync()
    >>> kanban = conn.root.sites[''].boards['test']
    >>> release = kanban.tasks[release_id]
    >>> task = kanban.tasks[task_id]

    >>> _ = updates(delete(user, '/board/test/tasks/' + task_id))
    {
      "generation": 19,
      "tasks": {
        "removals": [
          "00000000000000000000000000000013"
        ]
      }
    }


    >>> conn.sync()
    >>> list(release.archive) == [task]
    True

    >>> _ = updates(delete(user, '/board/test/tasks/' + release_id))
    {
      "generation": 20,
      "tasks": {
        "removals": [
          "00000000000000000000000000000012"
        ]
      }
    }

    >>> conn.sync()
    >>> list(kanban.tasks) == []
    True
    >>> kanban.archive[release_id] == release
    True
