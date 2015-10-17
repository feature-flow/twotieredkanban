import BTrees.OOBTree
import persistent
import zc.twotieredkanban.model

def webhook(kanban, request):
    try:
        jdata = kanban.jdata
    except AttributeError:
        jdata = kanban.jdata = Jira()
    tasks = jdata.tasks

    data = request.json
    issue = data['issue']
    fields = issue['fields']

    name = "%s %s" % (issue['key'], fields['summary'] or '')
    description = fields['description'] or ''
    epic = fields['customfield_10009']
    size = int(fields['customfield_10005'] or 1)
    if fields['customfield_10003']:
        blocked = 'Flagged in Jira'
    else:
        blocked = None
    key = issue['key']
    assignee = fields['assignee']
    if assignee:
        assignee = assignee['emailAddress']

    task = jdata.tasks.get(key)
    if task is None:
        if epic:
            release = jdata.tasks.get(epic)
            if release is None:
                release = zc.twotieredkanban.model = Task(epic)
                kanban.tasks.add(release)
            task = zc.twotieredkanban.model.Task(
                name, description=description,
                size=size, blocked=blocked, parent=release,
                assigned=assignee)
        else:
            task = zc.twotieredkanban.model.Task(name, description)

        kanban.tasks.add(task)
        tasks[key] = task
    else:
        kanban.update_task(
            task.id, name=name, description=description, size=size,
            blocked=blocked, assigned=assignee)

class Jira(persistent.Persistent):

    def __init__(self):
        self.tasks = BTrees.OOBTree.BTree()
