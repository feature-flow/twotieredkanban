# Asana proxy. sigh.

import bobo
import json
import os
import re
import requests

def error(message):
    raise bobo.BoboException(
        403,
        json.dumps(dict(error=message)),
        content_type='application/json',
        )

def read_file(path):
    with open(os.path.join(os.path.dirname(__file__), path)) as f:
        return f.read()

@bobo.query("/akb.html")
def index_html():
    return read_file("akb.html")

@bobo.query("/akb.js", content_type="application/javascript")
def index_js():
    return read_file("akb.js")

active_tags = 'development', 'demo', 'deploy'
dev_tags = 'doing', 'nr', 'review', 'done'


@bobo.subroute("/api/:key", scan=True)
class API:

    def __init__(self, request, key):
        self.request = request
        self.key = key

    def get(self, url):
        r = requests.get(
            'https://app.asana.com/api/1.0/' + url,
            auth=(self.key, ''),
            )
        if not r.ok:
            error(r.json()['errors'][0]['message'])
        return r.json()['data']

    def post(self, url, data):
        r = requests.post(
            'https://app.asana.com/api/1.0/' + url,
            auth=(self.key, ''),
            data=json.dumps(dict(data=data)),
            headers={'Content-Type': 'application/json'},
            )
        if not r.ok:
            error(r.json()['errors'][0]['message'])
        return r.json()['data']

    def put(self, url, data):
        r = requests.put(
            'https://app.asana.com/api/1.0/' + url,
            auth=(self.key, ''),
            data=json.dumps(dict(data=data)),
            headers={'Content-Type': 'application/json'},
            )
        if not r.ok:
            error(r.json()['errors'][0]['message'])
        return r.json()['data']

    @bobo.query("/releases", content_type="application/json")
    def releases(self):
        result = dict(active = [], backlog = [])
        for task_summary in self.get("projects/%s/tasks" % project):
            task = self.get("tasks/%s" % task_summary['id'])
            tags = [t['name'] for t in task['tags']]
            if 'release' not in tags:
                continue
            state = [t for t in active_tags if t in tags]
            if state:
                task['state'] = state[0]
                if task['state'] == 'development':
                    task['subtasks'] = [
                        self.get("tasks/%s" % subtask_summary['id'])
                        for subtask_summary in self.get(
                            "tasks/%s/subtasks" % task["id"])
                        ]
                    for subtask in task['subtasks']:
                        tags = [t['name'] for t in subtask['tags']]
                        state = [t for t in dev_tags if t in tags]
                        subtask['state'] = state[0] if state else 'ready'

                result['active'].append(task)
            else:
                result['backlog'].append(task)
        return result

    tag_ids = {}

    def get_tags_ids():
        global tag_ids
        tag_ids = dict((t['name'], t['id']) for t in self.get("tags"))

    @bobo.post("/moved")
    def moved(source, target, nodes):
        old_state = source.split("_")[0]
        new_state = target.split("_")[0]

        if new_state not in tag_ids:
            get_tags_ids()
            if new_state not in tag_ids:
                error("Invalid new state, " + new_state)

        if old_state != 'ready':
            if old_state not in tag_ids:
                error("Invalid old state, " + old_state)

        if isinstance(nodes, basestring):
            nodes = nodes,

        for node in nodes:
            task_id = node.split("_")[1]
            if old_state != 'ready':
                self.post("tasks/%s/removeTag" % task_id,
                          dict(tag=tag_ids[old_state]))
            self.post("tasks/%s/addTag" % task_id,
                      dict(tag=tag_ids[new_state]))

        return 'ok'

    @bobo.query("/workspaces", content_type='application/json')
    def workspaces(self):
        return dict(data=self.get('workspaces'))

    @bobo.query("/workspaces/:workspace/projects",
                content_type='application/json')
    def projects(self, workspace):
        return dict(data=self.get('workspaces/%s/projects' % workspace))
