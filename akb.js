require([
            "dojo/aspect",
            "dojo/dnd/Source",
            "dojo/dom-class",
            "dojo/dom-construct",
            "dojo/query",
            "dojo/ready",
            "dojo/string",
            "dijit",
            "dijit/form/Button",
            "dijit/form/CheckBox",
            "dijit/form/Select",
            "dijit/form/TextBox",
            "dijit/Dialog",
            "dijit/Menu",
            "dijit/MenuItem",
            "dojo/topic",
            "dojo/domReady!"],
    function(
        aspect, Source, dom_class, dom_construct, query, ready, string,
        dijit, Button, CheckBox, Select, TextBox, Dialog,
        Menu, MenuItem, topic) {

        var all_tasks = {};              // task id -> task
        dom_class.add("task_detail", "hidden");

        if (! localStorage.api_key) {
            var dialog = new Dialog(
                {
                    title: 'API Key:'
                });
            dialog.containerNode.appendChild(
                new TextBox(
                    {
                        onChange: function (val) {
                            localStorage.api_key = val;
                        },
                        style: 'width: 30em'
                    }).domNode);
            dialog.containerNode.appendChild(
                new dijit.form.Button(
                    {
                        label: 'Cancel',
                        onClick: function () {
                            dialog.hide();
                        }
                    }).domNode);
            dialog.containerNode.appendChild(
                new dijit.form.Button(
                    {
                        label: 'OK',
                        onClick: function () {
                            window.location.reload();
                        }
                    }).domNode);
            dialog.show();
            return;
        }

        dojo.byId("top").appendChild(
            new Button(
                {
                    label: "Logout",
                    style: "float: right;",
                    onClick: function () {
                        delete localStorage.api_key;
                        delete localStorage.workspace_id;
                        delete localStorage.project_id;
                        window.location.reload();
                    }
                }).domNode);

        function get(url, load) {
            return dojo.xhrGet(
                {
                    url: 'api/' + localStorage.api_key + '/' + url,
                    handleAs: "json",
                    load: load,
                    error: function (data) {
                        alert(data);
                    }
                });
        }

        function post(url, content, load) {
            return dojo.xhrPost(
                {
                    url: 'api/' + localStorage.api_key + '/' + url,
                    handleAs: "json",
                    content: content,
                    load: load,
                    error: function (data) {
                        alert(data);
                    }
                    });

        }

        get("workspaces",
            function (data) {
                data = data.data;
                if (! localStorage.workspace_id) {
                    localStorage.workspace_id = data[0].id;
                }
                dojo.create("label", {innerHTML: "Workspace:"}, 'top');
                dojo.byId('top').appendChild(
                    new Select(
                        {
                            options: dojo.map(
                                data,
                                function (w) {
                                    return {
                                        label: w.name,
                                        value: w.id.toString(),
                                        selected:
                                        w.id == localStorage.workspace_id
                                    };
                                }),
                            onChange: function (v) {
                                localStorage.workspace_id = v;
                                window.location.reload();
                            }
                        }).domNode);
            }).then(
                function () {
                    get(
                        "workspaces/"+localStorage.workspace_id+"/projects",
                        function(data) {
                            data = data.data;
                            if (! localStorage.project_id) {
                                var development = dojo.filter(
                                    data,
                                    function (p) {
                                        return p.name == "Development";
                                    });
                                if (development.length > 0) {
                                    localStorage.project_id = development[0].id;
                                }
                                else {
                                    localStorage.project_id = data[0].id;
                                }
                            }
                            dojo.create(
                                "label", {innerHTML: "Project:"}, 'top');
                            dojo.byId('top').appendChild(
                                new Select(
                                    {
                                        options: dojo.map(
                                            data,
                                            function (p) {
                                                return {
                                                    label: p.name,
                                                    value: p.id.toString(),
                                                    selected:
                                                    p.id ==
                                                        localStorage.project_id
                                                };
                                            }),
                                        onChange: function (v) {
                                            localStorage.project_id = v;
                                            window.location.reload();
                                        }
                                    }).domNode);
                        }
                    ).then(new_project);
                });

        var item_template =
            "<div>${name}</div>" +
            "<div>Assigned: <span class='assignee'>${assignee}</span></div>";
        var release_template =
            "<span class='size'>${size}</span>" +
            "<span class='name'>${name}</span>";
        var dev_template =
            "<span class='remaining'>${remaining}</span>" +
            "<span class='size'>${size}</span>" +
            "<span class='name'>${name}</span>";
        function update_task_node(task) {
            if (task.parent == null) {
                var template = release_template;
                if (task.state == "development") {
                    template = dev_template;
                }
                task.node.innerHTML = string.substitute(
                    template,
                    {
                        size: task.size,
                        remaining: task.remaining || task.size,
                        name: task.name
                    });
            }
            else {
                var assignee = "";
                if (task.assignee != null) {
                    assignee = task.assignee.name;
                }
                task.node.innerHTML = string.substitute(
                    item_template,
                    {
                        name: task.name,
                        assignee: assignee
                    });
            }
        }

        function item_creator(task, hint) {
            if (hint == 'avatar') {
                return {
                    node: dojo.create('span', { innerHTML: task.name }),
                    data: task,
                    type: [task.dnd_class]
                };
            }
            var class_ = task.state;
            if (task.blocked) {
                class_ += ' blocked';
            }
            if (task.parent == null) {
                task.node = dojo.create(
                    'div',
                    {
                        class: 'release '+class_,
                        task_id: task.id
                    });
                update_task_node(task);
                return {
                    node: task.node,
                    data: task,
                    type: [task.dnd_class]
                };
            }
            class_ += ' task';
            var assignee = "";
            if (task.assignee != null) {
                class_ += " assigned";
            }
            task.node = dojo.create(
                'div',
                {
                    class: class_,
                    task_id: task.id
                });
            update_task_node(task);
            return {
                node: task.node,
                data: task,
                type: [task.dnd_class]
            };
        }

        var selected_task;
        var selected_node;
        dojo.byId("selected_task_assignee_div").appendChild(
            new Button(
                {
                    label: "Take",
                    onClick: function () {
                        if (selected_task == null) {
                            return;
                        }
                        post("take",
                             { task_id: selected_task.id },
                             function (task) {
                                 // XXX maybe other attrs changed
                                 selected_task.assignee = task.assignee;
                                 query('span', selected_node)[0].textContent =
                                     task.assignee.name;
                                 dom_class.add(selected_node, 'assigned');
                                 select_task(selected_task);
                             });

                    }
                }).domNode);

        var blocked_checkbox = new CheckBox(
            {
                class: 'zc-widget',
                onChange: function (v) {
                    if (v == selected_task.blocked) {
                        return;
                    }
                    post(
                        "blocked",
                        {
                            task_id: selected_task.id,
                            is_blocked: v
                        }).then(
                            function () {
                                if (v) {
                                    dom_class.add(
                                        selected_node, "blocked");
                                }
                                else {
                                    dom_class.remove(
                                        selected_node, "blocked");
                                }
                            });
                }
            });
        dom_construct.place(blocked_checkbox.domNode, 'blocked_div');

        function select_task(task) {
            selected_task = task;
            dojo.byId("selected_task_title").textContent = task.name;
            if (task.parent == null) {
                // release
                dom_class.add("selected_task_assignee_div", "hidden");
                dom_class.remove("stop_working", "hidden");
            }
            else {
                dom_class.add("stop_working", "hidden");
                dom_class.remove("selected_task_assignee_div", "hidden");
                if (task.assignee != null) {
                    dojo.byId("selected_task_assignee"
                             ).textContent = task.assignee.name;
                }
                else {
                    dojo.byId("selected_task_assignee").textContent = "";
                }
            }
            dojo.byId("asana_link").setAttribute(
                "href",
                "https://app.asana.com/0/" +
                    localStorage.project_id + "/" + task.id
            );
            blocked_checkbox.set('value', task.blocked);
            dom_class.remove("task_detail", "hidden");
        }

        function td_source(parent, dnd_class, state) {
            var source = new Source(
                dojo.create(
                    "td", {
                        class: state+"_td",
                        id: state + '_' + dnd_class
                    }, parent),
                {
                    accept: [dnd_class],
                    creator: item_creator,
                    task_state: state
                });
            aspect.after(
                source, 'onMouseUp', function (e) {
                    var nodes = source.getSelectedNodes();
                    if (nodes.length > 0) {
                        selected_node = nodes[0];
                        source.selectNone();
                        select_task(
                            all_tasks[
                                nodes[0].attributes['task_id'].textContent
                            ]);
                    }
                }, true);
            return source;
        }

        function make_detail(parent, task) {
            dojo.create(
                "table", {
                    id: 'table_'+task.id,
                    class: 'task_detail',
                    innerHTML: (
                        "<thead>" +
                            "<th>Ready</th>" +
                            "<th>Doing</th>" +
                            "<th>Needs Review</th>" +
                            "<th>Review</th>" +
                            "<th>Done</th>" +
                            "</thead><tbody id='subtasks_" + task.id +
                            "'></tbody>")
                },
                parent);
            var id = "subtasks_" + task.id;
            var tr = dojo.create("tr", null, id);
            var stages = {};
            stages.ready = td_source(tr, id, 'ready');
            stages.doing = td_source(tr, id, 'doing');
            stages.nr = td_source(tr, id, 'nr');
            stages.review = td_source(tr, id, 'review');
            stages.done = td_source(tr, id, 'done');
            dojo.forEach(
                task.subtasks,
                function (subtask) {
                    all_tasks[subtask.id.toString()] = subtask;
                    subtask.dnd_class = id;
                    stages[subtask.state].insertNodes(false, [subtask]);
                });
        }

        function make_release(task) {
            if (task.tr == undefined) {
                var tr = dojo.create("tr", null, "projects");
                var stages = {};
                stages.analysis = td_source(tr, task.id, 'analysis');
                stages.devready = td_source(tr, task.id, 'devready');
                stages.development = td_source(tr, task.id, 'development');
                var detail = dojo.create(
                    "td",
                    {
                        class: "detail_td",
                        id: "detail_"+task.id
                    }, tr);
                stages.demo = td_source(tr, task.id, 'demo');
                stages.deploy = td_source(tr, task.id, 'deploy');
                stages.deployed = td_source(tr, task.id, 'deployed');
                task.dnd_class = task.id;
                stages[task.state].insertNodes(false, [task]);
                if (task.state == "development") {
                    make_detail(detail, task);
                }
                task.tr = tr;
            }
            else {
                dom_class.remove(task.tr, "hidden");
            }
        }

        function setup_backlog_item(release) {
            all_tasks[release.id] = release;
            var node = dojo.create(
                'li',
                { innerHTML: "["+release.size+"] "+release.name },
                "backlog");
            var backlog_menu = new Menu(
                { targetNodeIds: [node] });
            backlog_menu.addChild(
                new MenuItem(
                    {
                        label: "Start: "+release.name,
                        onClick: function () {
                            post(
                                "start_working", {
                                    task_id: release.id
                                },
                                function () {
                                    release.state = 'analysis';
                                    make_release(release);
                                    backlog_menu.destroyRecursive();
                                    dom_construct.destroy(node);
                                });
                        }
                    }));
            backlog_menu.startup();
        }

        function new_project() {
            get("releases/" + localStorage.project_id,
                function (resp) {
                    dojo.forEach(
                        resp.active,
                        function (release) {
                            all_tasks[release.id.toString()] = release;
                            make_release(release);
                        });
                    dojo.forEach(resp.backlog, setup_backlog_item);
                }
               );
        }

        dom_construct.place(
            new Button(
                {
                    id: "stop_working",
                    label: "Stop working on this task",
                    onClick: function () {
                        post(
                            "stop_working",
                            {
                                task_id: selected_task.id,
                                state: selected_task.state
                            }).then(
                                function () {
                                    dom_class.add("task_detail", "hidden");
                                    dom_class.add(selected_task.tr, "hidden");
                                    setup_backlog_item(selected_task);
                                });
                    }
                }).domNode, "task_detail");

        topic.subscribe(
            "/dnd/drop",
            function(source, nodes, copy, target) {
                var task_ids = dojo.map(
                    nodes,
                    function (node) {
                        // Task id
                        var task_id = nodes[0].attributes.task_id.value;
                        var task = all_tasks[task_id];
                        dom_class.remove(node, source.task_state);
                        dom_class.add(node, target.task_state);
                        task.state = target.task_state;
                        return task_id;
                    });
                if (source.node.id.substring(0, 11) == "development") {
                    var task_id = nodes[0].attributes.task_id.value;
                    var table_node = dojo.byId("table_"+task_id);
                    dom_class.add(table_node, "hidden");
                }
                else if (target.node.id.substring(0, 11) == "development") {
                    var task_id = task_ids[0]; // There can be only one
                    var table_node = dojo.byId("table_"+task_id);
                    if (table_node == null) {
                        get("tasks/" + task_id + "/subtasks",
                            function (data) {
                                var task = all_tasks[task_id];
                                task.subtasks = data.subtasks;
                                task.remaining = task.size;
                                dojo.forEach(
                                    task.subtasks,
                                    function (subtask) {
                                        if (subtask.state == "done") {
                                            task.remaining -= subtask.size;
                                        }
                                    });
                                update_task_node(task);
                                make_detail(dojo.byId("detail_"+task_id), task);
                            });
                    }
                    else {
                        dom_class.remove(table_node, "hidden");
                    }
                }
                else if (source.node.id.substring(0, 4) == "done") {
                    dojo.forEach(
                        task_ids,
                        function (task_id) {
                            var subtask = all_tasks[task_id];
                            var task = all_tasks[subtask.parent.id];
                            task.remaining += subtask.size;
                            update_task_node(task);
                        });
                }
                else if (target.node.id.substring(0, 4) == "done") {
                    dojo.forEach(
                        task_ids,
                        function (task_id) {
                            var subtask = all_tasks[task_id];
                            var task = all_tasks[subtask.parent.id];
                            task.remaining -= subtask.size;
                            update_task_node(task);
                        });
                }
                target.selectNone();
                post(
                    "moved",
                    {
                        source: source.node.id,
                        target: target.node.id,
                        task_ids: task_ids
                    });
            });
    });
