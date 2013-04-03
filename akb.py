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


@bobo.query("/")
def index_html():
    return read_file("akb.html")

@bobo.query("/akb.js", content_type="application/javascript")
def akb_js():
    return read_file("akb.js")

@bobo.query("/akb.css", content_type="text/css")
def akb_css():
    return read_file("akb.css")

analysis = 'analysis'
ready = 'ready'
deployed = 'deployed'
done = 'done'

active_tags = analysis, 'devready', 'development', 'demo', 'deploy'
dev_tags = 'doing', 'nr', 'review', done

done_states = done, deployed

tag_ids = {}



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
        print 'post', url, data, r.ok
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

    @bobo.query("/releases/:project", content_type="application/json")
    def releases(self, project):
        result = dict(active = [], backlog = [])
        for task_summary in self.get("projects/%s/tasks" % project):
            task = self.get("tasks/%s" % task_summary['id'])
            if task['completed']:
                continue
            tags = [t['name'] for t in task['tags']]
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
                        subtask['state'] = state[0] if state else ready

                result['active'].append(task)
            else:
                result['backlog'].append(task)
        return result

    @bobo.query("/tasks/:task_id/subtasks", content_type="application/json")
    def subtasks(self, task_id):
        subtasks = [
            self.get("tasks/%s" % subtask_summary['id'])
            for subtask_summary in self.get("tasks/%s/subtasks" % task_id)
            ]
        for subtask in subtasks:
            tags = [t['name'] for t in subtask['tags']]
            state = [t for t in dev_tags if t in tags]
            subtask['state'] = state[0] if state else ready
        return dict(subtasks=subtasks)

    def get_tags_ids(self):
        global tag_ids
        tag_ids = dict((t['name'], t['id']) for t in self.get("tags"))


    def check_state(self, state):
        if state == ready:
            return state
        if state not in tag_ids:
            self.get_tags_ids()
            if state not in tag_ids:
                error("Invalid state, " + state)
        return state

    @bobo.post("/moved", content_type='application/json')
    def moved(self, source, target, task_ids):
        old_state = self.check_state(source.split("_")[0])
        new_state = self.check_state(target.split("_")[0])

        if isinstance(task_ids, basestring):
            task_ids = task_ids,

        for task_id in task_ids:
            if old_state != ready:
                self.post("tasks/%s/removeTag" % task_id,
                          dict(tag=tag_ids[old_state]))
            if new_state != ready:
                self.post("tasks/%s/addTag" % task_id,
                          dict(tag=tag_ids[new_state]))
            if old_state in done_states or new_state in done_states:
                self.put("tasks/%s" % task_id,
                         data=dict(completed = new_state in done_states))

        return {}

    @bobo.post("/start_working", content_type='application/json')
    def start_working(self, task_id):
        state = self.check_state(analysis)
        return self.post("tasks/%s/addTag" % task_id,
                         dict(tag=tag_ids[state]))

    @bobo.query("/workspaces", content_type='application/json')
    def workspaces(self):
        return dict(data=self.get('workspaces'))

    @bobo.query("/workspaces/:workspace/projects",
                content_type='application/json')
    def projects(self, workspace):
        return dict(data=self.get('workspaces/%s/projects' % workspace))

    @bobo.post("/take", content_type='application/json')
    def take(self, task_id):
        return self.put("tasks/%s" % task_id, data=dict(assignee = "me"))
