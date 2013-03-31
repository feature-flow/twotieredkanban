require(
    [ "dojo/dnd/Source",
      "dojo/topic",
      "dojo/domReady!" ],
    function(Source, topic) {

        function get(url, load) {
            dojo.xhrGet(
                {
                    url: url,
                    handleAs: "json",
                    load: load
                });
        }

        function item_creator(task) {
            return {
                node: dojo.create(
                    'div',
                    {
                        id: 'task_'+task.id,
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
                    border: 1,
                    innerHTML: (
                        "<table><thead>" +
                            "<th>Ready</th>" +
                            "<th>Doing</th>" +
                            "<th>Needs Review</th>" +
                            "<th>Review</th>" +
                            "<th>Done</th>" +
                            "</thead><tbody id='detail" + task.id +
                            "'></tbody></table>")
                },
                parent);
            var id = "detail" + task.id;
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
            var detail = dojo.create("td", null, tr);
            stages.demo = td_source(tr, task.id, 'demo');
            stages.deploy = td_source(tr, task.id, 'deploy');
            task.dnd_class = task.id;
            stages[task.state].insertNodes(false, [task]);
            if (task.state == "development") {
                make_detail(detail, task);
            }
        }

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
                        dojo.create('li', {innerHTML: release.name}, "backlog");
                    });
            }
           );

        topic.subscribe(
            "/dnd/drop",
            function(source, nodes, copy, target) {
                dojo.xhrPost(
                    {
                        url: "moved",
                        handleAs: "json",
                        content: {
                            source: source.node.id,
                            target: target.node.id,
                            nodes: dojo.map(
                                nodes,
                                function (node) {
                                    return node.id;
                                })
                        }
                    });
            });
    });
