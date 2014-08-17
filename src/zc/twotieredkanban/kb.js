require([
            "dojo/_base/array",
            "dojo/_base/declare",
            "dojo/_base/lang",
            "dojo/_base/window",
            "dojo/cookie",
            "dojo/dnd/Source",
            "dojo/dom",
            "dojo/dom-class",
            "dojo/dom-construct",
            "dojo/json",
            "dojo/request/xhr",
            "dojo/string",
            "dijit/CheckedMenuItem",
            "dijit/form/Button",
            "dijit/form/CheckBox",
            "dijit/form/Select",
            "dijit/form/TextBox",
            "dijit/Dialog",
            "dijit/Menu",
            "dijit/MenuItem",
            "dojo/topic",
            "dojox/uuid/generateTimeBasedUuid",
            "dojox/lang/functional",
            "dojox/socket",
            "zc.dojo",
            "dojo/domReady!"],
    function(
        array, declare, lang, win, cookie,
        Source, dom, dom_class, dom_construct, json, xhr, string,
        CheckedMenuItem, Button, CheckBox, Select, TextBox, Dialog,
        Menu, MenuItem, topic, generateTimeBasedUuid, functional,
        socket, dojoform
    ) {
        var hitch = lang.hitch;
        var forEach = array.forEach;

        var admins;
        var generation = 0;
        var model;
        var releases = {};
        jim = releases;
        var users;

        var task_widgets = [
                {
                    name: "Name",
                    required: true,
                    widget_constructor: "zope.schema.TextLine"
                },
                {
                    name: "Description",
                    widget_constructor: "zope.schema.Text"
                }
        ];

        function single_use_dialog(props) {
            var dialog = new Dialog(props);
            dialog.on("hide",
                      function () {
                          dialog.destroyRecursive();
                      });
            return dialog;
        }

        function form_dialog(title, widgets, alabel, handler) {
            var dialog,
                formargs = {
                actions: [
                    {name: "aname", label: alabel},
                    {name: "Cancel"}
                ],
                handler: function (data, action) {
                    dialog.hide();
                    if (action.name == "aname") {
                        handler(data);
                    }
                }
            };
            if (typeof(widgets) == "string") {
                formargs.groups = [{ id: "confirm_message" }];
            }
            else {
                formargs.widgets = widgets;
            }
            dialog = single_use_dialog(
                {
                    title: title,
                    content: dojoform.build_form2(formargs)
                });
            if (typeof(widgets) == "string") {
                dom.byId("confirm_message").innerHTML= widgets;
            }
            dialog.show();
        }

        var link_re = /https?:\/\/\S+/g;
        var punctuation = {'.': 1, ',': 1, ';': 1, ':': 1};

        var BaseTask = {

            change_state: function(old_state) {
                if (this.node) {
                    if (old_state) {
                        dom_class.remove(this.node, old_state);
                    }
                    if (this.state) {
                        dom_class.add(this.node, this.state);
                    }
                }
            },

            context_menu_items: function() {
                var items = [
                    new MenuItem(
                        {
                            label: "Edit",
                            onClick: hitch(this, "edit")
                        }),
                    new CheckedMenuItem(
                        {
                            label: "Blocked",
                            onChange: hitch(this, "set_blocked"),
                            checked: this.blocked
                        }
                    ),
                    new MenuItem(
                        {
                            label: "Take",
                            onClick: hitch(this, "take")
                        }
                    )
                ];
                forEach(
                    this.get_links(),
                    function (link) {
                        items.push(new MenuItem({ label: link,
                                                  onClick: function () {
                                                      window.open(link);
                                                  }
                                                })
                                  );
                    });
                return items;
            },

            create_card: function (hint) {
                var self = this;
                if (hint == 'avatar') {
                    // A "card" to display while dragging.
                    return {
                        node: dom_construct.create('span', {
                            innerHTML: self.name }),
                        data: self,
                        type: [self.dnd_class]
                    };
                }
                if (self.menu) {
                    self.menu.destroyRecursive();
                }
                self.node = dom_construct.create(
                    'div', {
                        "class": "card " + self.type_class,
                        task_id: self.id
                    });
                self.update_card();
                this.node.onclick = hitch(this, function () {
                    dom_class.toggle(this.node, "show-detail");
                });
                return {
                    node: self.node,
                    data: self,
                    type: [self.dnd_class]
                };
            },

            edit: function() {
                var edit_widgets = array.map(
                    task_widgets,
                    function (widget) {
                        return declare.safeMixin({}, widget);
                    });
                edit_widgets[0].value = this.name || '';
                edit_widgets[1].value = this.notes || '';

                form_dialog(
                    "Edit task",
                    edit_widgets,
                    "Save",
                    hitch(
                        this,
                        function (data) {
                            put(this.parent ?
                                "/releases/" + this.parent.id +
                                '/tasks/' + this.id :
                                "/releases/" + this.id,
                                {
                                    name: data.Name,
                                    description: data.Description
                                });
                        })
                );
            },

            get_innerHTML: function () {
                var html = "<div>" + this.name + "</div>";
                html += this.get_notes_html();
                if (this.assignee) {
                    html += (
                        "<div class='assignment'>" +
                            "Assigned: <span class='assignee'>" +
                            this.assignee.name +
                            "</span></div>"
                    );
                }
                return html;
            },

            get_links: function () {
                link_re.lastIndex = 0;
                return this.get_links_helper((this.notes || '') + ' ', []);
            },

            get_links_helper: function (text, result) {
                if (text) {
                    var match = link_re.exec(text);
                    if (match) {
                        match = match[0];
                        if (match[match.length-1] in punctuation) {
                            match = match.substring(0, match.length - 1);
                        }
                        result.push(match);
                        return this.get_links_helper(text, result);
                    }
                }
                return result;
            },

            get_notes_html: function () {
                return "<div class='notes'>" +
                    (this.notes || "(no description)").replace(/\n/g, '<br>') +
                    "</div>";
            },

            set_blocked: function(v) {
                if (v == this.blocked) {
                    return;
                }
                post("blocked", this.parent_qualify(
                         { task_id: this.id, is_blocked: v}));
            },

            take: function () {
                post("take", this.parent_qualify({ task_id: this.id }));
            },

            update_card: function () {
                this.node.innerHTML = this.get_innerHTML();
                this.update_flag_class(this.blocked, "blocked");
                this.update_flag_class(this.assignee, "assigned");
                this.update_flag_class(this.completed, "completed");
                if (this.state) {
                    this.update_flag_class(
                        this.get_states()[this.state].working, "working");
                    dom_class.add(this.node, this.state);
                }
                if (this.menu) {
                    this.menu.destroyRecursive();
                }
                this.menu = new Menu({ targetNodeIds: [this.node] });
                forEach(
                    this.context_menu_items(),
                    hitch(this, function (item) {
                        this.menu.addChild(item);
                    }));
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
                var old_state = this.state;
                declare.safeMixin(this, data);
                if (this.state != old_state) {
                    this.remove_card(); // We'll add card when we update state
                    this.change_state(old_state);
                }
                this.update_card();
            }
        };
        BaseTask = declare("zc.asanakanban.BaseTask", null, BaseTask);

        var Release = {

            constructor: function(args) {
                var self = this;
                self.id = args.id;
                self.subtasks = {};
                forEach(
                    args.adds,
                    function (add) {
                        if (add.id == self.id) {
                            declare.safeMixin(self, add);
                        }
                    });
                self.change_state();
                forEach(
                    args.adds,
                    function (add) {
                        if (add.id != self.id) {
                            self.subtasks[add.id] = new Task(add, self);
                        }
                    });
            },

            handle_updates: function (update) {
                // XXX contents
                var self = this;
                var subtasks = self.subtasks;
                forEach(
                    update.removals,
                    function (removal) {
                        subtasks[removal].remove_card();
                        delete subtasks[removal];
                    });
                forEach(
                    update.adds,
                    function (add) {
                        if (add.id in subtasks) {
                            subtasks[add.id].update(add);
                        }
                        else {
                            if (add.id == this.id) {
                                this.update(add);
                            }
                            else if (add.id in self.subtasks) {
                                this.subtasks[add.id].update(add);
                            }
                            else {
                                this.subtasks[add.id] = new Task(add, self);
                            }
                        }
                    });
            },

            parent_qualify: function (data) { return data; },

            add: function(task) {
                var substage = this.substage_for_task(task);
                if (substage) {
                    task.dnd_class = 'subtasks_' + this.state + "_" + this.id;
                    substage.insertNodes(false, [task]);
                }
            },

            add_subtask: function () {
                form_dialog(
                    "New subtask",
                    task_widgets,
                    "Add",
                    hitch(this, function (data) {
                              post("/releases/"+this.id, {
                                       name: data.Name,
                                       description: data.Description
                                   });
                          })
                );
            },

            backlog_create_view: function () {
                var node = dom_construct.create(
                    'li', { "class": "backlog_item" }, "backlog");
                this.node = node;
                this.backlog_update();
                this.node.onclick = hitch(this, function () {
                    dom_class.toggle(this.node, "show-detail");
                });
                var backlog_menu = new Menu( { targetNodeIds: [node] });
                backlog_menu.addChild(
                    new MenuItem(
                        {
                            label: "Start: "+this.name,
                            onClick: hitch(this, "start_working")
                        }));
                backlog_menu.addChild(
                    new MenuItem(
                        {
                            label: "Add subtask",
                            onClick: hitch(this, "add_subtask")
                        }));
                backlog_menu.startup();
                this.menu = backlog_menu;
            },

            backlog_update: function () {
                var html =  "["+this.size+"] "+this.name;
                if (this.notes || this.subtasks) {
                    html += "<div class='backlog_detail'>";
                    html += this.get_notes_html();
                    if (this.subtasks) {
                        html += 'Subtasks: <ul>';
                        forEach(
                            this.subtasks,
                            function (subtask) {
                               html += '<li>' + subtask.name + '</li>';
                            });
                        html += '</ul>';
                    }
                    html += "</div>";
                }
                this.node.innerHTML = html;
            },

            change_state: function(old_state) {
                var new_state = this.state;
                if (old_state) {
                    if (this.substages) {
                        this.destroy_detail();
                    }
                }
                else {
                    if (this.menu) {
                        // It's in the backlog
                        this.menu.destroyRecursive();
                        delete this.menu;
                        dom_construct.destroy(this.node);
                        delete this.node;
                    }
                }

                this.inherited(arguments);

                if (new_state) {
                    if (! old_state) {
                        this.create_working_views();
                    }
                    else {
                        if (! this.node) {
                            this.stages[new_state].insertNodes(false, [this]);
                        }
                    }
                    if (model.release_tags[new_state].substates) {
                        this.create_detail(
                            dom.byId(new_state+"_detail_"+this.id));
                        forEach(this.subtasks, hitch(this, this.add));
                    }
                }
                else {
                    this.destroy_working_views();
                    this.backlog_create_view();
                }
            },

            context_menu_items: function () {
                var items = this.inherited(arguments);
                items.push(
                    new MenuItem(
                        {
                            label: "Move to backlog",
                            onClick: hitch(this, "stop_working")
                        }
                    ));
                items.push(
                    new MenuItem(
                        {
                            label: "Add subtask",
                            onClick: hitch(this, "add_subtask")
                        }
                    ));
                return items;
            },

            create_detail: function(parent) {
                var self = this;
                var thead = "<thead>";
                forEach(
                    model.release_tags[self.state].substates,
                    function (substate) {
                        thead += "<th>" + substate.label + "</th>";
                    }
                );
                var id = "subtasks_" + self.state + "_" + self.id;
                dom_construct.create(
                    "table", {
                        id: 'table_' + self.state + "_" + self.id,
                        "class": 'task_detail',
                        innerHTML:
                        thead + "</thead><tbody id='" + id + "'></tbody>"
                    },
                    parent);
                var tr = dom_construct.create("tr", null, id);
                var stages = {};
                forEach(
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
                    dom_construct.create(
                        "td", {
                            "class": state+"_td",
                            id: state + '_' + dnd_class
                        }, parent_node),
                    {
                        accept: [dnd_class],
                        creator: function item_creator(task, hint) {
                            return task.create_card(hint);
                        }
                    });
                return source;
            },

            create_working_views: function() {
                var self = this;
                var tr = dom_construct.create("tr", null, "projects");
                var stages = {};
                forEach(
                    model.states,
                    function (state) {
                        stages[state.tag] = self.create_dnd_source(
                            tr, self.id, state.tag);
                        if (state.substates) {
                            var detail = dom_construct.create(
                                "td",
                                {
                                    "class": state.tag+"_detail",
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
                // Clean up card menus
                functional.forIn(
                    this.subtasks, function(subtask) {
                        if (subtask.menu) {
                            subtask.menu.destroyRecursive();
                        }
                    });

                // Clean up sources
                forEach(
                    this.substages,
                    function (substage) {
                        substage.destroy();
                    });
                delete this.substages;

                dom_construct.destroy('table_' + this.state + "_" + this.id);
            },

            destroy_working_views: function() {

                if (this.menu) {
                    this.menu.destroy();
                }

                // Clean up sources
                forEach(
                    this.stages,
                    function (substage) {
                        substage.destroy();
                    });
                delete this.stages;

                // And the tr
                dom_construct.destroy(this.tr);
                delete this.tr;
            },

            get_innerHTML: function () {
                return "<div>" + string.substitute(
                    "<span class='remaining'>${remaining}</span>" +
                        "<span class='size'>${size}</span>",
                    {
                        size: this.size,
                        remaining: this.remaining()
                    }) + this.inherited(arguments).substr(5);

            },

            get_states: function () {
                return model.release_tags;
            },

            remove_card: function () {
                if (this.state) {
                    this.remove_card_helper(this.stages[this.state], this);
                }
            },

            remove_card_helper: function(old_source, task) {
                // We do half of the move here.
                // We remove the task/release from it's old source.
                // We'll add to the new source when the new state is set.
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

                // Delete the task node & menu.
                task.menu.destroyRecursive();
                delete task.menu;
                delete task.node;
            },

            remove_card_subtask: function (task) {
                if (this.state) {
                    this.remove_card_helper(this.substage_for_task(task), task);
                }
            },

            remaining: function () {
                var remaining = this.size;
                functional.forIn(
                    this.subtasks, function (subtask) {
                        if (subtask.completed) {
                            remaining -= subtask.size;
                        }
                    });
                return remaining;
            },

            start_working: function () {
                post("new-state", {
                         new_state: model.states[0].tag,
                         task_ids: this.id
                     });
            },

            stop_working: function() {
                post("new-state", {
                         new_state: "",
                         task_ids: this.id
                     });
            },

            substage_for_task: function (task) {
                if (this.state) {
                    if (this.substages) {
                        if (task.state) {
                            if (task.state in this.substages) {
                                return this.substages[task.state];
                            }
                        }
                        else {
                            return this.substages[
                                model.release_tags[this.state].substates[0].tag
                            ];
                        }
                    }
                }
                return null;
            },

            type_class: "release",

            update_card: function () {
                if (this.state) {
                    this.inherited(arguments);
                }
                else {
                    this.backlog_update();
                }
            }
        };
        Release = declare("zc.asanakanban.Release", [BaseTask], Release);

        var Task = {

            constructor: function(args, parent){
                declare.safeMixin(this, args);
                this.parent = parent;
                this.change_state();
            },

            parent_qualify: function (data) {
                data.parent_id = this.parent.id;
                return data;
            },

            change_state: function (old_state) {
                this.inherited(arguments);
                if (! this.node) {
                    this.parent.add(this);
                }
            },

            context_menu_items: function () {
                var items = this.inherited(arguments);
                items.push(
                    new MenuItem(
                        {
                            label: "Remove",
                            onClick: hitch(this, "remove")
                        }
                    ));
                return items;
            },

            enter_state: function() {},

            get_states: function() {
                return model.task_tags;
            },

            remove_card: function() {
                this.parent.remove_card_subtask(this);
            },

            remove: function () {
                form_dialog(
                    "Really?",
                    "Do you <em>really</em> want to remove "+
                        this.name+"?",
                    "Yes, really.",
                    hitch(this,
                          function (data) {
                              post("remove", {
                                       task_id: this.id,
                                       parent_id: this.parent.id
                                   });
                          })
                );
            },

            type_class: "task",

            update_card: function () {
                this.inherited(arguments);
                this.parent.update_card();
            }

        };
        Task = declare("zc.asanakanban.Task", [BaseTask], Task);

        function xhr_error(data) {
            if (data.responseText) {
                data = data.responseText;
                try {
                    data = JSON.parse(data).error;
                } catch (x) {}
            }
            alert(data);
        }

        function del(url, load) {
            return xhr.del(
                url, {
                    handleAs: "json",
                    headers: { 'X-Generation': generation }
                }).then(
                    function (data) {
                        if (load) {
                            load(data);
                        }
                        handle_updates(data);
                    }, xhr_error);
        }

        function get(url, load) {
            return xhr.get(
                url, {
                    handleAs: "json",
                    headers: { 'X-Generation': generation }
                }).then(
                    function (data) {
                        if (load) {
                            load(data);
                        }
                        handle_updates(data);
                    }, xhr_error);
        }

        function post(url, content, load) {
            return xhr.post(
                url, {
                    handleAs: "json",
                    headers: {
                        'X-Generation': generation,
                        "Content-Type": "application/json"
                    },
                    data: json.stringify(content)
                }).then(
                    function (data) {
                        if (load) {
                            load(data);
                        }
                        handle_updates(data);
                    }, xhr_error);
        }

        function put(url, content, load) {
            return xhr.put(
                url, {
                    handleAs: "json",
                    headers: {
                        'X-Generation': generation,
                        "Content-Type": "application/json"
                    },
                    data: json.stringify(content)
                }).then(
                    function (data) {
                        if (load) {
                            load(data);
                        }
                        handle_updates(data);
                    }, xhr_error);
        }

        function handle_updates(data) {
            if (data.updates) {
                data = data.updates;
            }
            else {
                return;
            }
            // XXX data.contents
            forEach(
                data.removals,
                function (removal) {
                    if (removal in releases) {
                        releases[removal].remove();
                    }
                }
            );
            forEach(
                data.adds,
                function (add) {
                    if (! add.id) {
                        users = add.users;
                        admins = add.admins;
                    }
                    else if (add.id in releases) {
                        releases[add.id].handle_updates(add);
                    }
                    else {
                        releases[add.id] = new Release(add);

                    }
                }
            );
            generation = data.generation;
        }

        dom.byId("top").appendChild(
            new Button(
                {
                    label: "Logout",
                    style: "float: right;",
                    onClick: function () {
                        navigator.id.logout();
                    }
                }).domNode);

        get("/model.json",
            function (data) {
                model = data;
                model.release_tags = {};
                model.task_tags = {};
                forEach(
                    model.states,
                    function (state) {
                        dom_construct.create(
                            "th",
                            {
                                colspan: state.substates ? 2 : 1,
                                innerHTML: state.label
                            },
                            board_headers);
                        model.release_tags[state.tag] = state;
                        if (state.substates) {
                            state.tags = {};
                            forEach(
                                state.substates,
                                function (substate) {
                                    state.tags[substate.tag] = substate;
                                    model.task_tags[substate.tag] =
                                        substate;
                                });
                        }
                    });
                get('/poll');

                dom_construct.place(
                    new Button({ label: "New release",
                                 onClick: add_release }).domNode,
                    win.body());
            });

        function move_handler(source, nodes, copy, target) {
            var data = {
                state: target.node.id.split("_")[0]
            };
            var release_id;

            // Collect task ids.
            // While we're at it, Update the task states
            var task_ids = array.map(
                nodes,
                function (node) {
                    var task_id = nodes[0].attributes.task_id.value;
                    if (! (task_id in releases)) {
                        var id = target.node.id.split("_");
                        release_id = id[id.length-1];
                    }
                    return task_id;
                });

            var url;
            if (release_id) {
                data.task_ids = task_ids;
                url = '/releases/' + release_id + '/move';
            }
            else {
                data.release_ids = task_ids;
                url = '/move';
            }

            target.selectNone();
            put(url, data);
        };
        topic.subscribe("/dnd/drop", move_handler);

        function add_release() {
            form_dialog("New release", task_widgets, "Add",
                        function (data) {
                            post("releases", {
                                     name: data.Name,
                                     description: data.Description
                                 });
                        });
        }

    });
