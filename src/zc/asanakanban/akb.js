require([
            "dojo/_base/lang",
            "dojo/aspect",
            "dojo/cookie",
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
            "dojox/uuid/generateTimeBasedUuid",
            "dojox/socket",
            "dojo/domReady!"],
    function(
        lang, aspect, cookie, Source, dom_class, dom_construct, query, ready,
        string,
        dijit, Button, CheckBox, Select, TextBox, Dialog,
        Menu, MenuItem, topic, generateTimeBasedUuid, socket
    ) {

        var all_tasks = {};              // task id -> task
        var model;
        dom_class.add("task_detail", "hidden");

        if (localStorage.api_key) {
            cookie("X-API-key", localStorage.api_key);
            get_workspace();
        }
        else {
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
                    url: "/api/"+url,
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
                    url: "/api/"+url,
                    handleAs: "json",
                    content: content,
                    load: load,
                    error: function (data) {
                        alert(data);
                    }
                });

        }

        function get_workspace() {
            get("workspaces",
                function (data) {
                    data = data.data;
                    if (data.length == 1) {
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
                    if (localStorage.workspace_id) {
                        cookie("X-Workspace-ID", localStorage.workspace_id);
                        get_project();
                    }
                    else {
                        dojo.create(
                            "span",
                            {
                                innerHTML:
                                "Select a workspace. (One that can have tags.)"
                            },
                            "top");
                    }

                });
        }

        function get_project() {
            get(
                "workspaces/"+localStorage.workspace_id+"/projects",
                function(data) {
                    data = data.data;
                    if (data.length == 1) {
                        localStorage.project_id = data[0].id;
                    }
                    if (! localStorage.project_id) {
                        var development = dojo.filter(
                            data,
                            function (p) {
                                return p.name == "Development";
                            });
                        if (development.length > 0) {
                            localStorage.project_id = development[0].id;
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
                    if (localStorage.project_id) {
                        cookie("X-Project-ID", localStorage.project_id);
                        get_model();
                    }
                    else {
                        dojo.create(
                            "span",
                            {
                                innerHTML: "Select a project."
                            },
                            "top");
                        return;
                    }
                });
        }

        function get_model() {
            get("model.json",
                function (data) {
                    model = data;
                    model.release_tags = {};
                    dojo.forEach(
                        model.states,
                        function (state) {
                            dojo.create(
                                "th",
                                {
                                    colspan: state.substates ? 2 : 1,
                                    innerHTML: state.label
                                },
                                board_headers);
                            model.release_tags[state.tag] = state;
                            if (state.substates) {
                                state.tags = {};
                                dojo.forEach(
                                    state.substates,
                                    function (substate) {
                                        if (! state.default_state) {
                                            state.default_state = substate.tag;
                                        }
                                        state.tags[substate.tag] = substate;
                                    });
                            }
                        });
                    new_project();
                });
        }

        function get_parent(task) {
            return all_tasks[task.parent.id];
        }

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
                if (model.release_tags[task.state].substates) {
                    template = dev_template;
                }

                var remaining = task.size;
                dojo.forEach(
                    task.subtasks,
                    function (subtask) {
                        subtask = all_tasks[subtask.id];
                        if (subtask && subtask.completed) {
                            remaining -= 1;
                        }
                    });

                task.node.innerHTML = string.substitute(
                    template,
                    {
                        size: task.size,
                        remaining: remaining,
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

        function get_task_state(task, tags, default_state) {
            var state = dojo.filter(
                task.tags,
                function (tag) {
                    return tag.name in tags;
                });
            if (state.length > 0) {
                task.state = state[0].name;
            }
            else {
                task.state = default_state;
            }
        }

        function get_task_blocked(task) {
            task.blocked = dojo.filter(
                task.tags,
                function (tag) {
                    return tag.name == "blocked";
                }
            ).length > 0;
        }

        var size_re = /^\s*\[\s*(\d+)\s*\]/;
        function get_task_size(task) {
            var m = size_re.exec(task.name);
            if (m) {
                task.size = parseInt(m[1]);
            }
            else {
                task.size = 1;
            }
        }

        function get_release_size(release) {
            var size = 0;
            dojo.forEach(
                release.subtasks,
                function (task) {
                    get_task_size(task);
                    size += task.size;
                });
            release.size = size;
        }

        function make_detail(parent, task) {
            var thead = "<thead>";
            dojo.forEach(
                model.release_tags[task.state].substates,
                function (substate) {
                    thead += "<th>" + substate.label + "</th>";
                }
            );
            var id = "subtasks_" + task.state + "_" + task.id;
            dojo.create(
                "table", {
                    id: 'table_' + task.state + "_" + task.id,
                    class: 'task_detail',
                    innerHTML:
                    thead + "</thead><tbody id='" + id + "'></tbody>"
                },
                parent);
            var tr = dojo.create("tr", null, id);
            var stages = {};
            dojo.forEach(
                model.release_tags[task.state].substates,
                function (substate) {
                    stages[substate.tag] = td_source(tr, id, substate.tag);
                }
            );
            task.substages = stages;
        }

        function destroy_detail(task) {
            dojo.forEach(
                task.substages,
                function (substage) {
                    substage.destroy();
                });
            delete task.substages;
            dom_construct.destroy('table_' + task.state + "_" + task.id);
        }

        function setup_release_views(task) {
            var tr = dojo.create("tr", null, "projects");
            var stages = {};
            dojo.forEach(
                model.states,
                function (state) {
                    stages[state.tag] = td_source(tr, task.id, state.tag);
                    if (state.substates) {
                        var detail = dojo.create(
                            "td",
                            {
                                class: state.tag+"_detail",
                                id: state.tag+"_detail_"+task.id
                            }, tr);
                        if (task.state == state.tag) {
                            make_detail(detail, task);
                            get("subtasks/"+task.id);
                        }
                    }
                });
            task.stages = stages;
            task.dnd_class = task.id;
            stages[task.state].insertNodes(false, [task]);
            task.tr = tr;
        }

        function change_state(task, new_state) {
            dom_class.remove(task, task.state);
            // clean up details
            if (task.substages) {
                destroy_detail(task);
            }

            task.state = new_state;
            dom_class.add(task, task.state);

            if (task.parent) {
                return;
            }

            if (model.release_tags[new_state].substates) {
                make_detail(dojo.byId(new_state+"_detail_"+task.id), task);
                dojo.forEach(
                    task.subtasks,
                    function (subtask) {
                        subtask = all_tasks[subtask.id];
                        if (subtask) {
                            task.substages[subtask.state].insertNodes(
                                false, [subtask]);
                        }
                    });
            }

        }

        function receive(event) {
            var task = JSON.parse(event.data);
            get_task_blocked(task);
            if (task.parent) {
                var super_state = model.release_tags[
                    all_tasks[task.parent.id].state];
                get_task_state(
                    task, super_state.tags, super_state.default_state);
                get_task_size(task);
            }
            else {
                get_task_state(task, model.release_tags);
                get_release_size(task);
            }
            if (task.id in all_tasks) {
                var old = all_tasks[task.id];
                if (task.state != old.state) {
                    // Move task to new dnd source
                    if (task.parent) {
                        var parent = all_tasks[task.parent.id];
                        var old_source = parent.substages[old.state];
                        var new_source = parent.substages[task.state];
                    }
                    else {
                        var old_source = old.stages[old.state];
                        var new_source = old.stages[task.state];
                    }
                    old_source.selectNone(); // make sure it's clear
                    // select the old node, dirtily cuz dojo doesn't
                    // provide an API.
                    old_source.selection[old.node.id] = 1;
                    old_source.deleteSelectedNodes();
                    new_source.insertNodes(false, [old]);

                    change_state(old, task.state);
                }
                lang.mixin(old, task);
                update_task_node(old);
            }
            else {
                // New task
                all_tasks[task.id] = task;
                if (task.parent == null) {
                    // Release
                    if (task.state) {
                        setup_release_views(task);
                    }
                    else {
                        // Backlog
                        setup_backlog_item(task);
                    }
                }
                else {
                    // Release task
                    var parent = all_tasks[task.parent.id];
                    task.dnd_class = (
                        'subtasks_' + parent.state + "_" + parent.id);
                    if (parent.substages) {
                        parent.substages[task.state].insertNodes(false, [task]);
                    }
                }
            }

            if (task.parent) {
                var parent = get_parent(task);
                if (parent) {
                    update_task_node(parent);
                }
            }
        }

        function new_project() {
            cookie("X-UUID", generateTimeBasedUuid());
            dojox.socket("/api/project").on("message", receive);
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

                var old_state = source.node.id.split("_")[0];
                var new_state = target.node.id.split("_")[0];

                // Collect task ids.
                // While we're at it, Update the task states
                var task_ids = dojo.map(
                    nodes,
                    function (node) {
                        // Task id
                        var task_id = nodes[0].attributes.task_id.value;
                        change_state(all_tasks[task_id], new_state);
                        return task_id;
                    });

                target.selectNone();
                post(
                    "moved",
                    {
                        old_state: old_state,
                        new_state: new_state,
                        task_ids: task_ids
                    });
            });

    });
