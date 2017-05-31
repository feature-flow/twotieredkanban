import expect from 'expect';
import indexedDB from 'indexedDB';
import BoardAPI from '../model/demoboardapi';
import SiteAPI from '../model/demositeapi';

describe("demo board api", () => {

  beforeEach("Add board", (done) => {
    new SiteAPI({setState: () => null}, (api) => {
      api.add_board('test', () => {
        // Add another board to provide an opportunity to fail at
        // keeping separate board data separate:
        api.add_board('test2', () => {
          const view = {setState: expect.createSpy()};
          new BoardAPI(view, 'test2', (board_api) => {
            board_api.add_project('Proj', 'the proj', () => {
              let project;
              [project] = board_api.model.all_tasks;
              board_api.add_task(
                project.id, 'Task', 'the task', 2, null, () => {
                done();
                });
            });
          });
        });
      });
    });
  });
  
  afterEach("Clean up database", (done) => {
    BoardAPI.test_reset(done);
  });

  const state = (order, props) => {
    const s = {order: order,
               explode: false, working: false, complete: false, task: false};
    Object.assign(s, typeof props == 'string' ? {title: props} : props);
    s.id = s.id || s.title;
    return s;
  };


  const basic_state = (state) => ({
    order: state.order, id: state.id, title: state.title,
    explode: state.explode, working: state.working, complete: state.complete,
    task: state.task});
  
  it("should set up initial state", (done) => {
    const view = {setState: expect.createSpy()};
    new BoardAPI(view, 'test', (api) => {
      const model = api.model;
      expect(view.setState).toHaveBeenCalledWith({model: model});
      expect(model.name).toEqual('test');
      expect(model.title).toEqual('');
      expect(model.description).toEqual('');
      expect(model.user).toEqual(
        {id: "ryou", nick: "ryou", email: "ryou@example.com",
         name: "Ryou Person", admin: true, current: true});
      expect(model.states.map(basic_state)).toEqual([
        state(0, 'Backlog'),
        state(1, 'Ready'),
        state(2, {title: 'Development', explode: true}),
        state(3, {"task": true, "title": "Ready", "id": "ready"}),
        state(4, {"task": true, "title": "Doing", "working": true}),
        state(5, {"task": true, "title": "Needs review"}),
        state(6, {"task": true, "title": "Review", "working": true}),
        state(7, {"task": true, "title": "Done", "complete": true}),
        state(8, "Acceptance"),
        state(9, "Deploying"),
        state(10, "Deployed")
      ]);
      expect(model.tasks).toEqual({});
      expect(model.site).toEqual(
        {boards: [{name: 'test', title: '', description: ''},
                  {name: 'test2', title: '', description: ''}],
         users: [
           {"id": "alex", "nick": "alex", "email": "alex@example.com",
            "name": "Alex Person"},
           {"id": "cas", "nick": "cas", "email": "cas@example.com",
            "name": "Cas Person"},
           {"id": "gal", "nick": "gal", "email": "gal@example.com",
            "name": "Gal Person"},
           {"id": "jaci", "nick": "jaci", "email": "jaci@example.com",
            "name": "Jaci Person", "admin": true},
           {"id": "kiran", "nick": "kiran", "email": "kiran@example.com",
            "name": "Kiran Person"},
           {"id": "ryou", "nick": "ryou", "email": "ryou@example.com",
            "name": "Ryou Person", "admin": true, "current": true}
         ]}
      );
      done();
    });
  });

  it("should load state", (done) => {
    const view = {setState: expect.createSpy()};
    new BoardAPI(view, 'test2', (api) => {
      const model = api.model;
      expect(view.setState).toHaveBeenCalledWith({model: model});
      expect(model.name).toEqual('test2');
      expect(model.title).toEqual('');
      expect(model.description).toEqual('');
      expect(model.states.map(basic_state)).toEqual([
        state(0, 'Backlog'),
        state(1, 'Ready'),
        state(2, {title: 'Development', explode: true}),
        state(3, {"task": true, "title": "Ready", "id": "ready"}),
        state(4, {"task": true, "title": "Doing", "working": true}),
        state(5, {"task": true, "title": "Needs review"}),
        state(6, {"task": true, "title": "Review", "working": true}),
        state(7, {"task": true, "title": "Done", "complete": true}),
        state(8, "Acceptance"),
        state(9, "Deploying"),
        state(10, "Deployed")
      ]);
      expect(model.all_tasks.map((t) => (
        {title: t.title, description: t.description, parent: !! t.parent,
         size: t.size
        })))
        .toEqual([
          {title: 'Task', description: 'the task', parent: true, size: 2},
          {title: 'Proj', description: 'the proj', parent: false, size: 0}
        ]);
      expect(model.site).toEqual(
        {boards: [{name: 'test', title: '', description: ''},
                  {name: 'test2', title: '', description: ''}],
         users: [
           {"id": "alex", "nick": "alex", "email": "alex@example.com",
            "name": "Alex Person"},
           {"id": "cas", "nick": "cas", "email": "cas@example.com",
            "name": "Cas Person"},
           {"id": "gal", "nick": "gal", "email": "gal@example.com",
            "name": "Gal Person"},
           {"id": "jaci", "nick": "jaci", "email": "jaci@example.com",
            "name": "Jaci Person", "admin": true},
           {"id": "kiran", "nick": "kiran", "email": "kiran@example.com",
            "name": "Kiran Person"},
           {"id": "ryou", "nick": "ryou", "email": "ryou@example.com",
            "name": "Ryou Person", "admin": true, "current": true}
         ]}
      );
      done();
    });
  });

  it("Should add projects", (done) => {
    const view = {setState: expect.createSpy()};
    new BoardAPI(view, 'test', (api) => {
      view.setState.restore();
      const model = api.model;
      api.add_project('first', 'do the first', () => {
        expect(view.setState).toHaveBeenCalledWith({model: model});
        let project;
        [project] = model.all_tasks;
        expect(project.title).toBe('first');
        expect(project.description).toBe('do the first');
        expect(project.order).toBe(0);
        done();
      });
    });
  });

  it("Should add tasks", (done) => {
    const view = {setState: expect.createSpy()};
    new BoardAPI(view, 'test', (api) => {
      const model = api.model;
      api.add_project('first', 'do the first', () => {
        let project;
        [project] = model.all_tasks;
        view.setState.restore();
        api.add_task(project.id, 'a task', 'do the task', 2, null, () => {
          expect(view.setState).toHaveBeenCalledWith({model: model});
          let task;
          [task] = model.all_tasks.filter((task) => task.id != project.id);
          expect(task.title).toBe('a task');
          expect(task.description).toBe('do the task');
          expect(task.size).toBe(2);
          expect(task.blocked).toBe(null);
          expect(task.order).toBeLessThan(0);
          done();
        });
      });
    });
  });

  it("Should update tasks", (done) => {
    const view = {setState: expect.createSpy()};
    new BoardAPI(view, 'test', (api) => {
      const model = api.model;
      api.add_project('first', 'do the first', () => {
        let project;
        [project] = model.all_tasks;
        api.add_task(project.id, 'a task', 'do the task', 2, null, () => {
          expect(view.setState).toHaveBeenCalledWith({model: model});
          let task;
          [task] = model.all_tasks.filter((task) => task.id != project.id);
          view.setState.restore();
          api.update_task(task.id, 'A task', 'Do the task', 3, 'waaa', () => {
            expect(view.setState).toHaveBeenCalledWith({model: model});
            expect(task.title).toBe('A task');
            expect(task.description).toBe('Do the task');
            expect(task.size).toBe(3);
            expect(task.blocked).toBe('waaa');

            // Check partial udate
            view.setState.restore();
            api.update_task(task.id, 'Task', 'Do the Task',
                            undefined, undefined, () => {
              expect(view.setState).toHaveBeenCalledWith({model: model});
              expect(task.title).toBe('Task');
              expect(task.description).toBe('Do the Task');
              expect(task.size).toBe(3);
              expect(task.blocked).toBe('waaa');
              done();
            });
          });
        });
      });
    });
  });

  const promise = (f) => new Promise((complete) => f(complete));

  it("Should move tasks", (done) => {
    const view = {setState: expect.createSpy()};
    new BoardAPI(view, 'test', (api) => {
      const model = api.model;
      let t1, t2, t3;
      promise((cb) => {
        api.add_project('first', 'do the first', () => {
          api.add_project('second', 'do the second', () => {
            api.add_project('third', 'do the third', () => {
              [t3, t2, t1] = model.all_tasks;
              cb();
            });
          });
        });
        api.handle_error = expect.createSpy();
      })
        .then(() => promise((cb) => {
          // Make second project a task
          view.setState.restore();
          api.move(t2.id, t1.id, 'Doing', undefined, () => {
            expect(view.setState).toHaveBeenCalledWith({model: model});
            expect(t2.parent.id).toBe(t1.id);
            expect(t2.state.id).toBe('Doing');
            expect(t2.order).toBeGreaterThan(0);
            cb();
          });
        }))
        .then(() => promise((cb) => {
          // Move first project to new state  
          view.setState.restore();
          api.move(t1.id, null, 'Development', undefined, () => {
            expect(view.setState).toHaveBeenCalledWith({model: model});
            expect(t1.parent).toBe(null);
            expect(t1.state.id).toBe('Development');
            expect(t1.order).toBeGreaterThan(t2.order);
            cb();
          });
        }))
        .then(() => promise((cb) => {
          // Move t1 before t3
          view.setState.restore();
          api.move(t1.id, null, 'Development', t3.id, () => {
            expect(view.setState).toHaveBeenCalledWith({model: model});
            expect(t1.parent).toBe(null);
            expect(t1.state.id).toBe('Development');
            expect(t1.order).toBeLessThan(t3.order);
            cb();
          });
        }))
        .then(() => promise((cb) => {
          // Can't move to task
          api.move(t3.id, t2.id, 'Doing', undefined, () => {
            expect(api.handle_error)
              .toHaveBeenCalledWith("can't move task into a (sub)task");
            expect(t3.parent).toBe(null);        // Unchanged
            expect(t3.state.id).toBe('Backlog'); // Unchanged
            cb();
          });
        }))
        .then(() => promise((cb) => {
          // Can't make non-empty feature a task:
          api.move(t1.id, t3.id, 'Doing', undefined, () => {
            expect(api.handle_error)
              .toHaveBeenCalledWith(
                "can't demote project to task if it has children");
            expect(t1.parent).toBe(null);        // Unchanged
            expect(t1.state.id).toBe('Development'); // Unchanged
            cb();
          });
        }))
        .then(() => promise((cb) => {
          // Can't move to feature with task state:
          api.move(t3.id, null, 'Doing', undefined, () => {
            expect(api.handle_error)
              .toHaveBeenCalledWith(
                "Invalid move-to state: task state without parent task");
            expect(t3.state.id).toBe('Backlog'); // Unchanged
            cb();
          });
        }))
        .then(() => promise((cb) => {
          // Can't move to project with top-level state:
          api.move(t3.id, t1.id, 'Backlog', undefined, () => {
            expect(api.handle_error)
              .toHaveBeenCalledWith(
                "Invalid move-to state: project state with parent task");
            expect(t3.state.id).toBe('Backlog'); // Unchanged
            cb();
          });
        }))
        .then(() => promise((cb) => {
          // We can promote a task to a feature:
          view.setState.restore();
          api.move(t2.id, null, 'Backlog', undefined, () => {
            expect(view.setState).toHaveBeenCalledWith({model: model});
            expect(t2.parent).toBe(null);
            expect(t2.state.id).toBe('Backlog');
            cb();
          });
        }))
        // XXX tests for complete state, but need to revist complete tracking
        .then(() => done());
    });
  });
  
});
