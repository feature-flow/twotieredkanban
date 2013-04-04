# Asana proxy. sigh.

import bobo
import json
import os
import re
import requests
import zc.thread

try:
    cache
except NameError:
    cache = None

def dev_mode(data):
    print "Running in development mode."
    global cache
    if cache is None:
        cache = {}

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
blocked = 'blocked'

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
        if cache is not None and url in cache:
            return cache[url]

        r = requests.get(
            'https://app.asana.com/api/1.0/' + url,
            auth=(self.key, ''),
            )
        if not r.ok:
            error(r.json()['errors'][0]['message'])

        r = r.json()['data']
        if cache is not None:
            cache[url] = r

        return r

    def post(self, url, data):
        r = requests.post(
            'https://app.asana.com/api/1.0/' + url,
            auth=(self.key, ''),
            data=json.dumps(dict(data=data)),
            headers={'Content-Type': 'application/json'},
            )
        if cache is not None:
            cache.clear()
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
        if cache is not None:
            cache.clear()
        if not r.ok:
            error(r.json()['errors'][0]['message'])
        return r.json()['data']

    def get_tasks_in_threads(self, tasks, filter=lambda task: True):
        threads = []

        for task in tasks:
            @zc.thread.Thread
            def thread():
                return self.get("tasks/%s" % task['id'])
            threads.append(thread)

        for thread in threads:
            thread.join(99)
            if thread.exception is not None:
                raise thread.exception

            task = thread.value
            if not task['name'].strip():
                continue  # Nameless tasks are just noise
            yield task

    @bobo.query("/releases/:project", content_type="application/json")
    def releases(self, project):
        result = dict(active = [], backlog = [])
        for task in self.get_tasks_in_threads(
            self.get("projects/%s/tasks" % project)
            ):
            if task['completed']:
                continue
            tags = [t['name'] for t in task['tags']]
            state = [t for t in active_tags if t in tags]
            task[blocked] = blocked in tags
            if state:
                task['state'] = state[0]
                if task['state'] == 'development':
                    task['subtasks'] = self.get_subtasks(task['id'])

                result['active'].append(task)
            else:
                result['backlog'].append(task)

        return result

    def get_subtasks(self, task_id):
        subtasks = list(self.get_tasks_in_threads(
            self.get("tasks/%s/subtasks" % task_id)))
        for subtask in subtasks:
            tags = [t['name'] for t in subtask['tags']]
            state = [t for t in dev_tags if t in tags]
            subtask['state'] = state[0] if state else ready
            subtask[blocked] = blocked in tags
        return subtasks

    @bobo.query("/tasks/:task_id/subtasks", content_type="application/json")
    def subtasks(self, task_id):
        return dict(subtasks=self.get_subtasks(task_id))

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

    @bobo.post("/blocked", content_type='application/json')
    def blocked(self, task_id, is_blocked):
        self.check_state(blocked)
        if is_blocked == 'true':
            return self.post("tasks/%s/addTag" % task_id,
                             dict(tag=tag_ids[blocked]))
        else:
            return self.post("tasks/%s/removeTag" % task_id,
                             dict(tag=tag_ids[blocked]))
