import expect from 'expect';
import MockDate from 'mockdate';

import indexedDB from 'indexedDB';
import BoardAPI from '../demo/boardapi';
import SiteAPI from '../demo/siteapi';

describe("demo board api", () => {

  let seconds = -1;

  const inc_date = () => {
    seconds += 1;
    MockDate.set(new Date(2017, 5, 8, 6, 2, seconds, 4), -300);
  };

  beforeEach("Set mock date & Add board", (done) => {
    seconds = -1; inc_date();
    new SiteAPI({setState: () => null}, (api) => {
      api.add_board('test', () => {
        // Add another board to provide an opportunity to fail at
        // keeping separate board data separate:
        api.add_board('test2', () => {
          const view = {setState: expect.createSpy()};
          new BoardAPI(view, 'test2', (board_api) => {
            board_api.add_project(
              {
                title: 'Proj',
                description: 'the proj'
              }, () => {
                let project;
                [project] = board_api.model.all_tasks;
                board_api.add_task(
                  {
                    project_id: 
                    project.id,
                    title: 'Task',
                    description: 'the task',
                    size: 2,
                    blocked: null,
                    assigned: undefined
                  }, () => {
                    done();
                  });
              });
          });
        });
      });
    });
  });
  
  afterEach("Clean up database and reset mock date", (done) => {
    BoardAPI.test_reset(done);
    () => MockDate.reset();
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
         name: "Ryou Bosso", admin: true, current: true});
      expect(model.states.map(basic_state)).toEqual([
        state(0, 'Backlog'),
        state(1, 'Ready'),
        state(2, {title: 'Development', explode: true, "working": true}),
        state(3, {"task": true, "title": "Ready", "id": "ready"}),
        state(4, {"task": true, "title": "Doing", "working": true}),
        state(5, {"task": true, "title": "Needs review"}),
        state(6, {"task": true, "title": "Review", "working": true}),
        state(7, {"task": true, "title": "Done", "complete": true}),
        state(8, {title: "Acceptance", "working": true}),
        state(9, {title: "Deploying", "working": true}),
        state(10, "Deployed")
      ]);
      expect(model.tasks).toEqual({});
      expect(model.boards).toEqual([
        { "description":
          "This sample board provides an example board with sample" +
          " projects and tasks",
          "name": "sample", "title": "Sample board" },
        {name: 'test', title: '', description: ''},
        {name: 'test2', title: '', description: ''}]);
      expect(model.users).toEqual([
        {"id": "alex", "nick": "alex", "email": "alex@example.com",
         "name": "Alex Peeple"},
        {"id": "cas", "nick": "cas", "email": "cas@example.com",
         "name": "Cas Emplo"},
        {"id": "gal", "nick": "gal", "email": "gal@example.com",
         "name": "Gal Humana"},
        {"id": "jaci", "nick": "jaci", "email": "jaci@example.com",
         "name": "Jaci Admi", "admin": true},
        {"id": "kiran", "nick": "kiran", "email": "kiran@example.com",
         "name": "Kiran Persons"},
        {"id": "ryou", "nick": "ryou", "email": "ryou@example.com",
         "name": "Ryou Bosso", "admin": true, "current": true}
      ]);
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
        state(2, {title: 'Development', explode: true, "working": true}),
        state(3, {"task": true, "title": "Ready", "id": "ready"}),
        state(4, {"task": true, "title": "Doing", "working": true}),
        state(5, {"task": true, "title": "Needs review"}),
        state(6, {"task": true, "title": "Review", "working": true}),
        state(7, {"task": true, "title": "Done", "complete": true}),
        state(8, {title: "Acceptance", "working": true}),
        state(9, {title: "Deploying", "working": true}),
        state(10, "Deployed")
      ]);
      expect(model.all_tasks.map((t) => (
        {title: t.title, description: t.description, parent: !! t.parent,
         size: t.size
        })))
        .toEqual([
          {title: 'Task', description: 'the task', parent: true, size: 2},
          {title: 'Proj', description: 'the proj', parent: false, size: 1}
        ]);
      expect(model.boards).toEqual([
        { "description":
          "This sample board provides an example board with sample" +
          " projects and tasks",
          "name": "sample", "title": "Sample board" },
        {name: 'test', title: '', description: ''},
        {name: 'test2', title: '', description: ''}]);
      expect(model.users).toEqual([
        {"id": "alex", "nick": "alex", "email": "alex@example.com",
         "name": "Alex Peeple"},
        {"id": "cas", "nick": "cas", "email": "cas@example.com",
         "name": "Cas Emplo"},
        {"id": "gal", "nick": "gal", "email": "gal@example.com",
         "name": "Gal Humana"},
        {"id": "jaci", "nick": "jaci", "email": "jaci@example.com",
         "name": "Jaci Admi", "admin": true},
        {"id": "kiran", "nick": "kiran", "email": "kiran@example.com",
         "name": "Kiran Persons"},
        {"id": "ryou", "nick": "ryou", "email": "ryou@example.com",
         "name": "Ryou Bosso", "admin": true, "current": true}
      ]);
      done();
    });
  });

  it("should add boards with a name", (done) => {
    const view = {setState: expect.createSpy()};
    new BoardAPI(view, 'sample', (api) => {
      api.add_board('test9', () => {
        view.setState.restore();
        api.add_board('test99', () => {
          const model = api.model;
          expect(view.setState).toHaveBeenCalledWith({model: model});
          expect(model.boards)
            .toEqual([
              { "description":
                "This sample board provides an example board with sample" +
                  " projects and tasks",
                "name": "sample", "title": "Sample board" },
              {name: 'test', title: '', description: ''},
              {name: 'test2', title: '', description: ''},
              {name: 'test9', title: '', description: ''},
              {name: 'test99', title: '', description: ''}
            ]);
          done();
        });
      });
    });
  });

  it("Should add projects", (done) => {
    const view = {setState: expect.createSpy()};
    new BoardAPI(view, 'test', (api) => {
      view.setState.restore();
      const model = api.model;
      api.add_project(
        {
          title: 'first',
          description: 'do the first'
        }, () => {
          expect(view.setState).toHaveBeenCalledWith({model: model});
          let project;
          [project] = model.all_tasks;
          expect(project.title).toBe('first');
          expect(project.description).toBe('do the first');
          expect(project.order).toBe(0);
          expect(project.state.id).toBe('Backlog');
          expect(project.history)
            .toEqual([{start: "2017-06-08T10:02:00.004", state: 'Backlog'}]);
          done();
        });
    });
  });

  it("Should add working projects", (done) => {
    const view = {setState: expect.createSpy()};
    new BoardAPI(view, 'test', (api) => {
      view.setState.restore();
      const model = api.model;
      api.add_project(
        {
          title: 'first',
          description: 'do the first',
          state_id: 'Development'
        }, () => {
          expect(view.setState).toHaveBeenCalledWith({model: model});
          let project;
          [project] = model.all_tasks;
          expect(project.title).toBe('first');
          expect(project.description).toBe('do the first');
          expect(project.order).toBe(0);
          expect(project.state.id).toBe('Development');
          expect(project.history)
            .toEqual([{
              start: "2017-06-08T10:02:00.004",
              state: 'Development',
              working: true
            }]);
          done();
        });
    });
  });

  it("Should add tasks", (done) => {
    const view = {setState: expect.createSpy()};
    new BoardAPI(view, 'test', (api) => {
      const model = api.model;
      api.add_project(
        {
          title: 'first',
          description: 'do the first'
        }, () => {
          let project;
          [project] = model.all_tasks;
          view.setState.restore();
          api.add_task(
            {
              project_id: project.id,
              title: 'a task',
              description: 'do the task',
              size: 2,
              blocked: '',
              assigned: 'cas'
            }, () => {
              expect(view.setState).toHaveBeenCalledWith({model: model});
              let task;
              [task] = model.all_tasks.filter((task) => task.id != project.id);
              expect(task.title).toBe('a task');
              expect(task.description).toBe('do the task');
              expect(task.size).toBe(2);
              expect(task.blocked).toBe('');
              expect(task.order).toBeLessThan(0);
              expect(task.assigned).toBe('cas');
              expect(task.state.id).toBe('ready');
              expect(task.history)
                .toEqual([
                  {
                    assigned: 'cas',
                    start: "2017-06-08T10:02:00.004",
                    state: 'ready'
                  }]);
              done();
            });
        });
    });
  });

  it("Should add complete tasks", (done) => { // for some reason :)
    const view = {setState: expect.createSpy()};
    new BoardAPI(view, 'test', (api) => {
      const model = api.model;
      api.add_project(
        {
          title: 'first',
          description: 'do the first'
        }, () => {
          let project;
          [project] = model.all_tasks;
          view.setState.restore();
          api.add_task(
            {
              project_id: project.id,
              title: 'a task',
              description: 'do the task',
              size: 2,
              blocked: '',
              assigned: 'cas',
              state_id: 'Done'
            }, () => {
              expect(view.setState).toHaveBeenCalledWith({model: model});
              let task;
              [task] = model.all_tasks.filter((task) => task.id != project.id);
              expect(task.title).toBe('a task');
              expect(task.description).toBe('do the task');
              expect(task.size).toBe(2);
              expect(task.blocked).toBe('');
              expect(task.order).toBeLessThan(0);
              expect(task.assigned).toBe('cas');
              expect(task.state.id).toBe('Done');
              expect(task.history)
                .toEqual([
                  {
                    assigned: 'cas',
                    start: "2017-06-08T10:02:00.004",
                    state: 'Done',
                    complete: true
                  }]);
              done();
            });
        });
    });
  });

  it("Should add will be working tasks", (done) => {
    const view = {setState: expect.createSpy()};
    new BoardAPI(view, 'test', (api) => {
      const model = api.model;
      api.add_project(
        {
          title: 'first',
          description: 'do the first'
        }, () => {
          let project;
          [project] = model.all_tasks;
          view.setState.restore();
          api.add_task(
            {
              project_id: project.id,
              title: 'a task',
              description: 'do the task',
              size: 2,
              blocked: '',
              assigned: 'cas',
              state_id: 'Doing'
            }, () => {
              expect(view.setState).toHaveBeenCalledWith({model: model});
              let task;
              [task] = model.all_tasks.filter((task) => task.id != project.id);
              expect(task.title).toBe('a task');
              expect(task.description).toBe('do the task');
              expect(task.size).toBe(2);
              expect(task.blocked).toBe('');
              expect(task.order).toBeLessThan(0);
              expect(task.assigned).toBe('cas');
              expect(task.state.id).toBe('Doing');
              expect(task.history)
                .toEqual([
                  {
                    assigned: 'cas',
                    start: "2017-06-08T10:02:00.004",
                    state: 'Doing'
                  }]);
              done();
            });
        });
    });
  });

  it("Should add working tasks", (done) => {
    const view = {setState: expect.createSpy()};
    new BoardAPI(view, 'test', (api) => {
      const model = api.model;
      api.add_project(
        {
          title: 'first',
          description: 'do the first'
        }, () => {
          let project;
          [project] = model.all_tasks;
          view.setState.restore();
          api.add_task(
            {
              project_id: project.id,
              title: 'a task',
              description: 'do the task',
              size: 2,
              blocked: '',
              assigned: 'cas',
              state_id: 'Doing'
            }, () => {
              expect(view.setState).toHaveBeenCalledWith({model: model});
              let task;
              [task] = model.all_tasks.filter((task) => task.id != project.id);
              expect(task.title).toBe('a task');
              expect(task.description).toBe('do the task');
              expect(task.size).toBe(2);
              expect(task.blocked).toBe('');
              expect(task.order).toBeLessThan(0);
              expect(task.assigned).toBe('cas');
              expect(task.state.id).toBe('Doing');
              expect(task.history)
                .toEqual([
                  {
                    assigned: 'cas',
                    start: "2017-06-08T10:02:00.004",
                    state: 'Doing'
                  }]);
              done();
            });
        });
    });
  });

  it("Should add working tasks", (done) => {
    const view = {setState: expect.createSpy()};
    new BoardAPI(view, 'test', (api) => {
      const model = api.model;
      api.add_project(
        {
          title: 'first',
          description: 'do the first',
          state_id: 'Development'
        }, () => {
          let project;
          [project] = model.all_tasks;
          view.setState.restore();
          api.add_task(
            {
              project_id: project.id,
              title: 'a task',
              description: 'do the task',
              size: 2,
              blocked: '',
              assigned: 'cas',
              state_id: 'Doing'
            }, () => {
              expect(view.setState).toHaveBeenCalledWith({model: model});
              let task;
              [task] = model.all_tasks.filter((task) => task.id != project.id);
              expect(task.title).toBe('a task');
              expect(task.description).toBe('do the task');
              expect(task.size).toBe(2);
              expect(task.blocked).toBe('');
              expect(task.order).toBeLessThan(0);
              expect(task.assigned).toBe('cas');
              expect(task.state.id).toBe('Doing');
              expect(task.history)
                .toEqual([
                  {
                    assigned: 'cas',
                    start: "2017-06-08T10:02:00.004",
                    state: 'Doing',
                    working: true
                  }]);
              done();
            });
        });
    });
  });

  it("Should update tasks", (done) => {
    const view = {setState: expect.createSpy()};
    new BoardAPI(view, 'test', (api) => {
      const model = api.model;
      api.add_project(
        {
          title: 'first',
          description: 'do the first'
        }, () => {
          let project;
          [project] = model.all_tasks;
          api.add_task(
            {
              project_id: project.id,
              title: 'a task',
              description: 'do the task',
              size: 2,
              blocked: null,
              assigned: undefined
            },
            () => {
              expect(view.setState).toHaveBeenCalledWith({model: model});
              let task;
              [task] = model.all_tasks.filter((task) => task.id != project.id);
              view.setState.restore();
              inc_date();
              api.update_task(task.id, {
                title: 'A task',
                description: 'Do the task',
                size: 3,
                blocked: 'waaa',
                assigned: 'cas'
              }, () => {
                expect(view.setState).toHaveBeenCalledWith({model: model});
                expect(task.title).toBe('A task');
                expect(task.description).toBe('Do the task');
                expect(task.size).toBe(3);
                expect(task.blocked).toBe('waaa');
                expect(task.assigned).toBe('cas');
                expect(task.history).toEqual([
                  {
                    assigned: 'cas',
                    start: "2017-06-08T10:02:00.004",
                    state: 'ready'
                  },
                ]);

                // Check partial udate
                view.setState.restore();
                api.update_task(task.id, {
                  title: 'Task',
                  description: 'Do the Task'
                }, () => {
                  expect(view.setState).toHaveBeenCalledWith({model: model});
                  expect(task.title).toBe('Task');
                  expect(task.description).toBe('Do the Task');
                  expect(task.size).toBe(3);
                  expect(task.blocked).toBe('waaa');
                  expect(task.assigned).toBe('cas');
                  done();
                });
              });
            });
        });
    });
  });

  const promise = (f) => new Promise((complete) => f(complete));

  it("Should move tasks, maintain tasks, and track completed", (done) => {
    const view = {setState: expect.createSpy()};
    new BoardAPI(view, 'test', (api) => {
      const model = api.model;
      let t1, t2, t3;
      promise((cb) => {
        api.add_project(
          {
            title: 'first',
            description: 'do the first'
          }, () => {
            api.add_project(
              {title: 'second',
               description: 'do the second'
              }, () => {
                api.add_project(
                  {
                    title: 'third',
                    description: 'do the third'
                  }, () => {
                    [t3, t2, t1] = model.all_tasks;
                    expect(t1.count).toBe(0);
                    expect(t1.total_size).toBe(0);
                    expect(t1.total_completed).toBe(0);
                    cb();
                  });
              });
          });
        api.handle_error = expect.createSpy();
      })
        .then(() => promise((cb) => {
          // Make second project a task
          view.setState.restore();
          inc_date();
          api.move(t2.id, t1.id, 'Doing', undefined, false, () => {
            expect(view.setState).toHaveBeenCalledWith({model: model});
            expect(t2.parent.id).toBe(t1.id);
            expect(t2.state.id).toBe('Doing');
            expect(t2.order).toBeGreaterThan(0);
            expect(t2.history).toEqual([
              {
                start: "2017-06-08T10:02:00.004",
                end: "2017-06-08T10:02:01.004",
                state: 'Backlog'
              },
              {
                start: "2017-06-08T10:02:01.004",
                assigned: "ryou", // Because we went to a working state
                state: "Doing"
              },
            ]);
            expect(t1.count).toBe(1);
            expect(t1.total_size).toBe(1);
            expect(t1.total_completed).toBe(0);
            cb();
          });
        }))
        .then(() => promise((cb) => {
          // change t2's size and see it reflected in stats
          api.update_task(
            t2.id,
            {title: t2.title, description: t2.description, size: 3}, () => {
              expect(t1.count).toBe(1);
              expect(t1.total_size).toBe(3);
              expect(t1.total_completed).toBe(0);
              cb();
            }); 
        }))
        .then(() => promise((cb) => {
          // Move first project to new state.
          // This should cause a new event in t2
          view.setState.restore();
          inc_date();
          api.move(t1.id, null, 'Development', undefined, false, (err) => {
            expect(view.setState).toHaveBeenCalledWith({model: model});
            expect(t1.parent).toBe(undefined);
            expect(t1.state.id).toBe('Development');
            expect(t1.order).toBeGreaterThan(t2.order);
            expect(t1.history).toEqual([
              {
                start: "2017-06-08T10:02:00.004",
                end: "2017-06-08T10:02:02.004",
                state: 'Backlog'
              },
              {
                start: "2017-06-08T10:02:02.004",
                state: "Development",
                working: true
              },
            ]);
            expect(t2.history).toEqual([
              {
                start: "2017-06-08T10:02:00.004",
                end: "2017-06-08T10:02:01.004",
                state: 'Backlog'
              },
              {
                start: "2017-06-08T10:02:01.004",
                end: "2017-06-08T10:02:02.004",
                assigned: "ryou",
                state: "Doing"
              },
              {
                start: "2017-06-08T10:02:02.004",
                state: "Doing",
                assigned: "ryou",
                working: true
              },
            ]);
            cb();
          });
        }))
        .then(() => promise((cb) => {
          // Move t1 before t3
          view.setState.restore();
          api.move(t1.id, null, 'Development', t3.id, false, () => {
            expect(view.setState).toHaveBeenCalledWith({model: model});
            expect(t1.parent).toBe(undefined);
            expect(t1.state.id).toBe('Development');
            expect(t1.order).toBeLessThan(t3.order);
            //////////////////////////////////////////////////////////////////
            // same as previous:
            expect(t1.history).toEqual([
              {
                start: "2017-06-08T10:02:00.004",
                end: "2017-06-08T10:02:02.004",
                state: 'Backlog'
              },
              {
                start: "2017-06-08T10:02:02.004",
                state: "Development",
                working: true
              },
            ]);
            expect(t2.history).toEqual([
              {
                start: "2017-06-08T10:02:00.004",
                end: "2017-06-08T10:02:01.004",
                state: 'Backlog'
              },
              {
                start: "2017-06-08T10:02:01.004",
                end: "2017-06-08T10:02:02.004",
                assigned: "ryou",
                state: "Doing"
              },
              {
                start: "2017-06-08T10:02:02.004",
                state: "Doing",
                assigned: "ryou",
                working: true
              },
            ]);
            //
            //////////////////////////////////////////////////////////////////
            cb();
          });
        }))
        .then(() => promise((cb) => {
          // Can't move to task
          api.move(t3.id, t2.id, 'Doing', undefined, false, () => {
            expect(api.handle_error)
              .toHaveBeenCalledWith("can't move task into a (sub)task");
            expect(t3.parent).toBe(undefined);        // Unchanged
            expect(t3.state.id).toBe('Backlog'); // Unchanged
            cb();
          });
        }))
        .then(() => promise((cb) => {
          // Can't make non-empty feature a task:
          api.move(t1.id, t3.id, 'Doing', undefined, false, () => {
            expect(api.handle_error)
              .toHaveBeenCalledWith(
                "can't demote project to task if it has children");
            expect(t1.parent).toBe(undefined);        // Unchanged
            expect(t1.state.id).toBe('Development'); // Unchanged
            cb();
          });
        }))
        .then(() => promise((cb) => {
          // Can't move to feature with task state:
          api.move(t3.id, null, 'Doing', undefined, false, () => {
            expect(api.handle_error)
              .toHaveBeenCalledWith(
                "Invalid move-to state: task state without parent task");
            expect(t3.state.id).toBe('Backlog'); // Unchanged
            cb();
          });
        }))
        .then(() => promise((cb) => {
          // Can't move to project with top-level state:
          api.move(t3.id, t1.id, 'Backlog', undefined, false, () => {
            expect(api.handle_error)
              .toHaveBeenCalledWith(
                "Invalid move-to state: project state with parent task");
            expect(t3.state.id).toBe('Backlog'); // Unchanged
            cb();
          });
        }))
        .then(() => promise((cb) => {
          // Finish t2
          expect(t1.count).toBe(1);
          expect(t1.total_size).toBe(3);
          expect(t1.total_completed).toBe(0);
          view.setState.restore();
          inc_date();
          api.move(t2.id, t1.id, 'Done', undefined, false, () => {
            expect(t2.parent.id).toBe(t1.id);
            expect(t2.state.id).toBe('Done');
            expect(t2.history).toEqual([
              {
                start: "2017-06-08T10:02:00.004",
                end: "2017-06-08T10:02:01.004",
                state: 'Backlog'
              },
              {
                start: "2017-06-08T10:02:01.004",
                end: "2017-06-08T10:02:02.004",
                assigned: "ryou",
                state: "Doing"
              },
              {
                start: "2017-06-08T10:02:02.004",
                end: "2017-06-08T10:02:03.004",
                state: "Doing",
                assigned: "ryou",
                working: true
              },
              {
                start: "2017-06-08T10:02:03.004",
                state: 'Done',
                assigned: "ryou",
                complete: true
              },
            ]);
            expect(t1.count).toBe(1);
            expect(t1.total_size).toBe(3);
            expect(t1.total_completed).toBe(3);
            cb();
          });
        }))
        .then(() => promise((cb) => {
          // We can promote a task to a feature:
          view.setState.restore();
          inc_date();
          api.move(t2.id, null, 'Backlog', undefined, false, () => {
            expect(view.setState).toHaveBeenCalledWith({model: model});
            expect(t2.parent).toBe(undefined);
            expect(t2.state.id).toBe('Backlog');
            expect(t2.history).toEqual([
              {
                start: "2017-06-08T10:02:00.004",
                end: "2017-06-08T10:02:01.004",
                state: 'Backlog'
              },
              {
                start: "2017-06-08T10:02:01.004",
                end: "2017-06-08T10:02:02.004",
                assigned: "ryou",
                state: "Doing"
              },
              {
                start: "2017-06-08T10:02:02.004",
                end: "2017-06-08T10:02:03.004",
                state: "Doing",
                assigned: "ryou",
                working: true
              },
              {
                start: "2017-06-08T10:02:03.004",
                end: "2017-06-08T10:02:04.004",
                state: 'Done',
                assigned: "ryou",
                complete: true
              },
              {
                start: "2017-06-08T10:02:04.004",
                state: 'Backlog'
              },
            ]);
            expect(t1.count).toBe(0);
            expect(t1.total_size).toBe(0);
            expect(t1.total_completed).toBe(0);
            cb();
          });
        }))
        .then((err) => done());
    });
  });

  const task_for_title = (model, title) => {
    return model.all_tasks.filter((t) => t.title === title)[0];
  };

  it("should archive and restore features", (done) => {
    const view = {setState: expect.createSpy()};
    let feature1, task1, x;
    new BoardAPI(view, 'test2', (api) => {
      [task1, feature1] = api.model.all_tasks;
      expect(feature1.title).toBe("Proj");
      expect(task1.title).toBe("Task");
      promise((cb) => {
        // Add some more tasks to make sure we don't archive everything
        inc_date();
        api.add_project({title: 'f1', description: ''}, () => {
          api.add_task({title: 't1', description: ''}, () => {
            api.add_task({title: 't2', description: ''}, () => {
              cb();
            });
          });
        });
      })
        .then(() => promise((cb) => {
          // Move the feature of interest to a different state, to make sure
          // the state is restored correctly
          inc_date();
          api.move(
            feature1.id, undefined, 'Development', undefined, false,
            () => {
              cb();
            });
        }))
        .then(() => promise((cb) => {
          inc_date();

          api.archive(feature1.id, (api, updates) => {
            expect(updates)
              .toEqual({
                board: {archive_count: 1},
                tasks: {removals: [task1.id, feature1.id]}
              });
            cb();
          });
        }))
        .then(() => promise((cb) => {
          // We get the right data when we create a new api
          new BoardAPI(view, 'test2', (api2) => {
            const model = api2.model;
            expect(model.all_tasks.map((t) => t.title))
              .toEqual(['t2', 't1', 'f1']);
            expect(model.archive_count).toBe(1);
            cb();
          });
        }))
        .then(() => promise((cb) => {
          // We can restore an archived feature
          inc_date();
          api.restore(feature1.id, (api, updates) => {
            expect(updates.board).toEqual({archive_count: 0});
            expect(updates.tasks.removals).toBe(undefined);
            expect(updates.tasks.adds.map((t) => t.id))
              .toEqual([task1.id, feature1.id]);
            const feature = updates.tasks.adds[1];
            expect(feature.history[feature.history.length-1]).toEqual({
              start: "2017-06-08T10:02:04.004",
              state: "Development",
              working: true
            });
            expect(feature.history[feature.history.length-2]).toEqual({
              start: "2017-06-08T10:02:03.004",
              end: "2017-06-08T10:02:04.004",
              state: "Development",
              working: true,
              archived: true
            });
            cb();
          }, cb);
        }))
        .then(() => promise((cb) => {
          // We get the right data when we create a new api
          new BoardAPI(view, 'test2', (api2) => {
            const model = api2.model;
            expect(model.all_tasks.map((t) => t.title))
              .toEqual(['t2', 't1', 'f1', 'Task', 'Proj']);
            expect(model.archive_count).toBe(0);
            cb();
          });
        }))
        .then(() => done());
    });
  });

  it("should search archived features", (done) => {
    const view = {setState: expect.createSpy()};
    new BoardAPI(view, 'test2', (api) => {
      const model = api.model;
      promise((cb) => {
        // Add a bunch of features...
        api.add_project({title: 'f1', description: 'foo'}, () => {
          api.add_project({title: 'f2', description: 'bar baz'}, () => {
            api.add_project({title: 'f3', description: 'bar bug'}, () => {
              api.add_project({title: 'f4', description: ''}, () => {
                api.add_project({title: 'f5', description: 'x bar'}, () => {
                  api.add_project({title: 'f6', description: ''}, () => {
                    api.add_project({title: 'f7', description: ''}, () => {
                      api.add_task(
                        { title: 't1', description: 'task bar',
                          project_id: task_for_title(model, 'f7').id
                        }, () => {
                          cb();
                        });
                    });
                  });
                });
              });
            });
          });
        });
      })
        .then(() => promise((cb) => {
          // Now archive them:
          inc_date();
          api.archive(task_for_title(model, 'f1').id, () => {
            inc_date();
            api.archive(task_for_title(model, 'f2').id, () => {
              inc_date();
              api.archive(task_for_title(model, 'f3').id, () => {
                inc_date();
                api.archive(task_for_title(model, 'f4').id, () => {
                  inc_date();
                  api.archive(task_for_title(model, 'f5').id, () => {
                    inc_date();
                    api.archive(task_for_title(model, 'f6').id, () => {
                      inc_date();
                      api.archive(task_for_title(model, 'f7').id, () => {
                        cb();
                      });
                    });
                  });
                });
              });
            });
          });
        }))
        .then(() => promise((cb) => {
          // Get the 5 most recently archived
          api.get_archived('', 0, 5, (features) => {
            expect(features.map((f) => f.title))
              .toEqual(['f7', 'f6', 'f5', 'f4', 'f3']);
            expect(features[0].tasks.map((t) => t.title))
              .toEqual(['t1']); // tasks are included
            cb();
          });
        }))
        .then(() => promise((cb) => {
          // Get the second batch of 3 most recently archived
          api.get_archived('', 3, 3, (features) => {
            expect(features.map((f) => f.title))
              .toEqual(['f4', 'f3', 'f2']);
            cb();
          });
        }))
        .then(() => promise((cb) => {
          // get bar features
          api.get_archived('bar', 0, 99, (features) => {
            expect(features.map((f) => f.title))
              .toEqual(['f7', 'f5', 'f3', 'f2']);
            cb();
          });
        }))
        .then(() => done());
    });
  });
  
});
