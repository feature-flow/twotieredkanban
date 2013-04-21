require([
            "dojo/_base/declare",
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
        declare, lang, aspect, cookie,
        Source, dom_class, dom_construct, query, ready,
        string,
        dijit, Button, CheckBox, Select, TextBox, Dialog,
        Menu, MenuItem, topic, generateTimeBasedUuid, socket
    ) {

        var BaseTask = {

            change_state: function(new_state) {
                if (this.node) {
                    if (this.state) {
                        dom_class.remove(this.node, this.state);
                    }
                    if (new_state) {
                        dom_class.add(this.node, new_state);
                    }
                }
                this.state = new_state;
            },

            constructor: function(args){
                dojo.safeMixin(this, args);
                all_tasks[args.id] = this;
                this.updated();
            },

            create_card: function (hint) {
                if (hint == 'avatar') {
                    return {
                        node: dojo.create('span', { innerHTML: this.name }),
                        data: this,
                        type: [this.dnd_class]
                    };
                }
                this.node = dojo.create(
                    'div', {
                        "class": this.type_class,
                        task_id: this.id
                    });
                this.update_card();
                return {
                    node: this.node,
                    data: this,
                    type: [this.dnd_class]
                };
            },

            get_blocked: function() {
                this.blocked = dojo.filter(
                    this.tags,
                    function (tag) {
                        return tag.name == "blocked";
                    }
                ).length > 0;
            },

            get_innerHTML: function () {
                return string.substitute(
                    "<div>${name}</div>" +
                        "<div class='assignment'>" +
                        "Assigned: <span class='assignee'>" +
                        "${assignee}</span></div>",
                    {
                        name: this.name,
                        assignee: (this.assignee != null) ?
                            this.assignee.name : ""
                    });
            },

            get_state: function () {
                this.change_state(this.get_state_helper(this));
            },

            get_state_helper: function (task) {
                var states = this.get_states();
                var state = dojo.filter(
                    task.tags,
                    function (tag) {
                        return tag.name in states;
                    });
                if (state.length > 0) {
                    return state[0].name;
                }
                else {
                    return null;
                }
            },

            size_re: /^\s*\[\s*(\d+)\s*\]/,
            get_subtask_size_helper: function(task) {
                var m = this.size_re.exec(task.name);
                if (m) {
                    task.size = parseInt(m[1]);
                }
                else {
                    task.size = 1;
                }
            },

            selected: function () {
                selected_task = this;
                dojo.byId("selected_task_title").textContent = this.name;
                dojo.byId("asana_link").setAttribute(
                    "href",
                    "https://app.asana.com/0/" +
                        localStorage.project_id + "/" + this.id
                );
                blocked_checkbox.set('value', this.blocked);
                dom_class.remove("task_detail", "hidden");
            },

            update_card: function () {
                this.node.innerHTML = this.get_innerHTML();
                this.update_flag_class(this.blocked, "blocked");
                this.update_flag_class(this.assignee, "assigned");
                this.update_flag_class(
                    this.get_states()[this.state].working, "working");
                this.update_flag_class(this.completed, "completed");
                dom_class.add(this.node, this.state);
            },

            update_flag_class: function(cond, class_) {
                if (cond) {
                    dom_class.add(this.node, class_);
                }
                else {
                    dom_class.remove(this.node, class_);
                }
            },

            update: function(data) {
                var new_state = this.get_state_helper(data);
                if (new_state != this.state) {
                    this.move(new_state);
                }
                dojo.safeMixin(this, data);
                this.updated();
                this.update_card();
            },

            updated: function () {
                this.get_blocked();
                this.get_state();
            }

        };
        BaseTask = declare("zc.asanakanban.BaseTask", null, BaseTask);

        var Release = {

            add: function(task) {
                if (this.state) {
                    task.dnd_class = (
                        'subtasks_' + this.state + "_" + this.id);
                    if (this.substages) {
                        this.substages[task.state].insertNodes(false, [task]);
                    }
                }
            },

            change_state: function(new_state) {
                self = this;
                var old_state = self.state;
                if (old_state) {
                    if (self.substages) {
                        self.destroy_detail();
                    }
                }
                else {
                    if (self.menu) {
                        // It's in the backlog
                        self.menu.destroyRecursive();
                        delete self.menu;
                        dom_construct.destroy(self.node);
                        delete self.node;
                    }
                }

                self.inherited(arguments);

                if (new_state) {
                    if (! old_state) {
                        self.create_working_views();
                    }
                    if (model.release_tags[new_state].substates) {
                        self.create_detail(
                            dojo.byId(new_state+"_detail_"+self.id));
                        get("subtasks/"+self.id);
                        dojo.forEach(
                            self.subtasks,
                            function (subtask) {
                                subtask = all_tasks[subtask.id];
                                if (subtask) {
                                    self.substages[subtask.state].insertNodes(
                                        false, [subtask]);
                                }
                            });
                    }
                }
                else {
                    this.destroy_working_views();
                    self.create_backlog_view();
                }

            },

            create_backlog_view: function () {
                self = this;
                var node = dojo.create(
                    'li',
                    { innerHTML: "["+self.size+"] "+self.name },
                    "backlog");
                var backlog_menu = new Menu(
                    { targetNodeIds: [node] });
                backlog_menu.addChild(
                    new MenuItem(
                        {
                            label: "Start: "+self.name,
                            onClick: function () {
                                var new_state = model.states[0].tag;
                                post("moved", {
                                         old_state: "",
                                         new_state: new_state,
                                         task_ids: self.id
                                     });
                            }
                        }));
                backlog_menu.startup();
                self.node = node;
                self.menu = backlog_menu;
            },

            create_detail: function(parent) {
                var self = this;
                var thead = "<thead>";
                dojo.forEach(
                    model.release_tags[self.state].substates,
                    function (substate) {
                        thead += "<th>" + substate.label + "</th>";
                    }
                );
                var id = "subtasks_" + self.state + "_" + self.id;
                dojo.create(
                    "table", {
                        id: 'table_' + self.state + "_" + self.id,
                        class: 'task_detail',
                        innerHTML:
                        thead + "</thead><tbody id='" + id + "'></tbody>"
                    },
                    parent);
                var tr = dojo.create("tr", null, id);
                var stages = {};
                dojo.forEach(
                    model.release_tags[self.state].substates,
                    function (substate) {
                        stages[substate.tag] = self.create_dnd_source(
                            tr, id, substate.tag);
                    }
                );
                self.substages = stages;
            },

            create_dnd_source: function (parent_node, dnd_class, state) {
                var source = new Source(
                    dojo.create(
                        "td", {
                            class: state+"_td",
                            id: state + '_' + dnd_class
                        }, parent_node),
                    {
                        accept: [dnd_class],
                        creator: function item_creator(task, hint) {
                            return task.create_card(hint);
                        }
                    });
                aspect.after(
                    source, 'onMouseUp', function (e) {
                        var nodes = source.getSelectedNodes();
                        if (nodes.length > 0) {
                            selected_node = nodes[0];
                            //source.selectNone();
                            all_tasks[nodes[0].attributes['task_id'].textContent
                                     ].selected();
                        }
                    }, true);
                return source;
            },

            create_working_views: function() {
                var self = this;
                var tr = dojo.create("tr", null, "projects");
                var stages = {};
                dojo.forEach(
                    model.states,
                    function (state) {
                        stages[state.tag] = self.create_dnd_source(
                            tr, self.id, state.tag);
                        if (state.substates) {
                            var detail = dojo.create(
                                "td",
                                {
                                    class: state.tag+"_detail",
                                    id: state.tag+"_detail_"+self.id
                                }, tr);
                        }
                    });
                self.stages = stages;
                self.dnd_class = self.id;
                stages[self.state].insertNodes(false, [self]);
                self.tr = tr;
            },

            destroy_detail: function() {
                dojo.forEach(
                    this.substages,
                    function (substage) {
                        substage.destroy();
                    });
                delete this.substages;
                dom_construct.destroy('table_' + this.state + "_" + this.id);
            },

            destroy_working_views: function() {
                dojo.forEach(
                    this.stages,
                    function (substage) {
                        substage.destroy();
                    });
                delete this.stages;
                dom_construct.destroy(this.tr);
                delete this.tr;
            },

            get_innerHTML: function () {
                return string.substitute(
                    "<span class='remaining'>${remaining}</span>" +
                        "<span class='size'>${size}</span>",
                    {
                        size: this.size,
                        remaining: this.remaining()
                    }) +  this.inherited(arguments);

            },

            get_size: function() {
                var self = this;
                var size = 0;
                dojo.forEach(
                    self.subtasks,
                    function (task) {
                        self.get_subtask_size_helper(task);
                        size += task.size;
                    });
                self.size = size;
            },

            get_states: function () {
                return model.release_tags;
            },

            move: function (new_state) {
                if (this.state && new_state) {
                    this.move_helper(
                        this.stages[this.state], this.stages[new_state], this);
                }
            },

            move_helper: function(old_source, new_source, task) {
                if (! (task.node.id in old_source.map)) {
                    // This is a little delicate.  When a user
                    // moves a node, we don't update the state right
                    // then because we don't want to update the state
                    // unless the server responds positively, at which
                    // point, there could be a race with the update
                    // coming in over the socket. So we
                    // basically check here to see if the node was
                    // already moved.
                    return;     // already moved
                }
                old_source.selectNone(); // make sure it's clear
                // select the old node, dirtily cuz dojo doesn't
                // provide an API.
                old_source.selection[task.node.id] = 1;
                old_source.deleteSelectedNodes();
                new_source.insertNodes(false, [task]);
            },

            move_subtask: function (task, new_state) {
                if (! this.state) {
                    return;
                }
                this.move_helper(
                    this.substages[task.state],
                    this.substages[new_state],
                    task);
            },

            remaining: function () {
                var remaining = this.size;
                dojo.forEach(
                    this.subtasks,
                    function (subtask) {
                        subtask = all_tasks[subtask.id];
                        if (subtask && subtask.completed) {
                            remaining -= 1;
                        }
                    });
                return remaining;
            },

            selected: function () {
                this.inherited(arguments);
                dom_class.add("selected_task_assignee_div", "hidden");
                dom_class.remove("stop_working", "hidden");
            },

            type_class: "release",

            update_card: function () {
                if (! this.state) {
                    return; // In backlog.
                }
                this.inherited(arguments);
            },

            updated: function() {
                this.get_size();
                this.inherited(arguments);
            }
        };
        Release = declare("zc.asanakanban.Release", [BaseTask], Release);

        var Task = {

            enter_state: function() {},

            get_parent: function () {
                return all_tasks[this.parent.id];
            },

            get_state: function () {
                this.inherited(arguments);
                if (! this.node) {
                    this.get_parent().add(this);
                }
            },

            get_state_helper: function (task) {
                var state = this.inherited(arguments);
                if (! state) {
                    state = model.release_tags[this.get_parent().state
                                         ].default_state;
                }
                return state;
            },

            get_states: function() {
                return model.release_tags[this.get_parent().state
                                         ].tags;
            },

            move: function(new_state) {
                this.get_parent().move_subtask(this, new_state);
            },

            selected: function () {
                this.inherited(arguments);
                dom_class.add("stop_working", "hidden");
                dom_class.remove("selected_task_assignee_div", "hidden");
                if (this.assignee != null) {
                    dojo.byId("selected_task_assignee"
                             ).textContent = this.assignee.name;
                }
                else {
                    dojo.byId("selected_task_assignee").textContent = "";
                }
            },

            type_class: "task"

        };
        Task = declare("zc.asanakanban.Task", [BaseTask], Task);

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
                        // XXX shoud display a toast here
                        post("take", { task_id: selected_task.id });
                    }
                }).domNode);

        var blocked_checkbox = new CheckBox(
            {
                class: 'zc-widget',
                onChange: function (v) {
                    if (v == selected_task.blocked) {
                        return;
                    }
                    // XXX shoud display a toast here (and require a reason)
                    // IOW, we'll redo this.
                    post("blocked",
                         { task_id: selected_task.id, is_blocked: v});
                }
            });
        dom_construct.place(blocked_checkbox.domNode, 'blocked_div');

        function receive(event) {
            var data = JSON.parse(event.data);

            if (data.id in all_tasks) {
                all_tasks[data.id].update(data);
            }
            else {
                data.parent ?
                    new zc.asanakanban.Task(data) :
                    new zc.asanakanban.Release(data);
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
                        var task = selected_task;
                        post("moved",
                             {
                                 old_state: task.state,
                                 new_state: "",
                                 task_ids: task.id
                             });
                    }
                }).domNode, "task_detail");

        function move_handler(source, nodes, copy, target) {

            var old_state = source.node.id.split("_")[0];
            var new_state = target.node.id.split("_")[0];

            // Collect task ids.
            // While we're at it, Update the task states
            var task_ids = dojo.map(
                nodes,
                function (node) {
                    var task_id = nodes[0].attributes.task_id.value;
                    //all_tasks[task_id].change_state(new_state);
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
        };
        topic.subscribe("/dnd/drop", move_handler);

    });
