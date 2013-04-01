require(
    [ "dojo/dnd/Source",
      "dojo/dom-style",
      "dojo/ready",
      "dijit",
      "dijit/form/Button",
      "dijit/form/Select",
      "dijit/form/TextBox",
      "dijit/Dialog",
      "dojo/topic",
      "dojo/domReady!" ],
    function(
        Source, style, ready, dijit, Button, Select, TextBox, Dialog, topic) {

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
                                localStorage.project_id = data[0].id;
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


        function item_creator(task, hint) {
            if (hint == 'avatar') {
                return {
                    node: dojo.create(
                        'span',
                        {
                            innerHTML: task.name
                        }),
                    data: task,
                    type: [task.dnd_class]
                };
            }
            return {
                node: dojo.create(
                    'div',
                    {
                        task_id: task.id,
                        innerHTML: task.name
                    }),
                data: task,
                type: [task.dnd_class]
            };
        }

        function td_source(parent, dnd_class, state) {
            return new Source(
                dojo.create(
                    "td", {id: state + '_' + dnd_class}, parent),
                {
                    accept: [dnd_class],
                    creator: item_creator
                });
        }

        function make_detail(parent, task) {
            dojo.create(
                "table", {
                    id: 'table_'+task.id,
                    border: 1,
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
                    subtask.dnd_class = id;
                    stages[subtask.state].insertNodes(false, [subtask]);
                });
        }

        function make_release(task) {
            var tr = dojo.create("tr", null, "projects");
            var stages = {};
            stages.development = td_source(tr, task.id, 'development');
            var detail = dojo.create("td", {id: "detail_"+task.id}, tr);
            stages.demo = td_source(tr, task.id, 'demo');
            stages.deploy = td_source(tr, task.id, 'deploy');
            task.dnd_class = task.id;
            stages[task.state].insertNodes(false, [task]);
            if (task.state == "development") {
                make_detail(detail, task);
            }
        }

        function new_project() {
            get("releases",
                function (resp) {
                    dojo.forEach(
                        resp.active,
                        function (release) {
                            make_release(release);
                        });
                    dojo.forEach(
                        resp.backlog,
                        function (release) {
                            dojo.create(
                                'li', {innerHTML: release.name}, "backlog");
                        });
                }
               );
        }

        topic.subscribe(
            "/dnd/drop",
            function(source, nodes, copy, target) {
                if (source.node.id.substring(0, 11) == "development") {
                    var task_id = nodes[0].attributes.task_id.value;
                    var table_node = dojo.byId("table_"+task_id);
                    style.set(table_node, "visibility", "hidden");
                }
                if (target.node.id.substring(0, 11) == "development") {
                    var task_id = nodes[0].attributes.task_id.value;
                    var table_node = dojo.byId("table_"+task_id);
                    if (table_node == null) {
                        get("tasks/" + task_id + "/subtasks",
                            function (data) {
                                var task = {
                                    id: task_id,
                                    name: nodes[0].textContent,
                                    subtasks: data.subtasks
                                };
                                make_detail(dojo.byId("detail_"+task_id), task);
                            });
                    }
                    else {
                        style.set(table_node, "visibility", "visible");
                    }
                }
                post(
                    "moved",
                    {
                        source: source.node.id,
                        target: target.node.id,
                        task_ids: dojo.map(
                            nodes,
                            function (node) {
                                // Task id
                                return nodes[0].attributes.task_id.value;
                            })
                    });
            });
    });
