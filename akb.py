# Asana proxy. sigh.

import bobo
import json
import re
import requests

api_key = 
project = 4754334231998

def error(message):
    raise bobo.BoboException(403, message)

def get(url):
    r = requests.get(
        'https://app.asana.com/api/1.0/' + url,
        auth=(api_key, ''),
        )
    if not r.ok:
        error(r.json()['errors'][0]['message'])
    return r.json()['data']

def post(url, data):
    r = requests.post(
        'https://app.asana.com/api/1.0/' + url,
        auth=(api_key, ''),
        data=json.dumps(dict(data=data)),
        headers={'Content-Type': 'application/json'},
        )
    if not r.ok:
        error(r.json()['errors'][0]['message'])
    return r.json()['data']

def put(url, data):
    r = requests.put(
        'https://app.asana.com/api/1.0/' + url,
        auth=(api_key, ''),
        data=json.dumps(dict(data=data)),
        headers={'Content-Type': 'application/json'},
        )
    if not r.ok:
        error(r.json()['errors'][0]['message'])
    return r.json()['data']

def read_file(path):
    with open(path) as f:
        return f.read()

@bobo.query("/akb.html")
def index_html():
    return read_file("akb.html")

@bobo.query("/akb.js", content_type="application/javascript")
def index_js():
    return read_file("akb.js")

active_tags = 'development', 'demo', 'deploy'
dev_tags = 'doing', 'nr', 'review', 'done'

@bobo.query("/releases", content_type="application/json")
def releases():
    result = dict(active = [], backlog = [])
    for task_summary in get("projects/%s/tasks" % project):
        task = get("tasks/%s" % task_summary['id'])
        tags = [t['name'] for t in task['tags']]
        if 'release' not in tags:
            continue
        state = [t for t in active_tags if t in tags]
        if state:
            task['state'] = state[0]
            if task['state'] == 'development':
                task['subtasks'] = [
                    get("tasks/%s" % subtask_summary['id'])
                    for subtask_summary in get("tasks/%s/subtasks" % task["id"])
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
    tag_ids = dict((t['name'], t['id']) for t in get("tags"))

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
            post("tasks/%s/removeTag" % task_id, dict(tag=tag_ids[old_state]))
        post("tasks/%s/addTag" % task_id, dict(tag=tag_ids[new_state]))

    return 'ok'

