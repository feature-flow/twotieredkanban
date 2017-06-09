import uuid from 'uuid/v1';

import {Board} from '../model/board';

import {BaseAPI, board_states} from './baseapi';
import default_states from './model.json';

const now = () => (new Date()).toJSON().replace('Z', '');

module.exports = class extends BaseAPI {

  constructor(view, name, cb) {
    super(new Board(name), view, cb);
  }

  add_all(store, objects, cb) {
    if (objects.length == 0) {
      cb(); // all done
    }
    else {
      this.r(store.add(objects[0]), () => {
        this.add_all(store, objects.slice(1), cb);
      });
    }
  }

  poll(cb) {
    super.poll().then((db) => {
      this.transaction(
        ['boards', 'states', 'tasks', 'users'], 'readwrite', (trans) => {
          this.boards(trans, (boards) => {
            this.users(trans, (users, user) => {
              const board = Object.assign({}, boards.filter(
                (board) => board.name == this.model.name)[0]);
              const site = {boards: boards, users: users};
              this.all(trans.objectStore('states')
                       .index('board').openCursor(this.model.name),
                       (states) => {
                         if (states.length == 0) {
                           const initial_states =
                                   board_states(this.model.name); 
                           this.add_all(
                             trans.objectStore('states'), initial_states,
                             () => {
                               this.update(
                                 trans,
                                 {board: board, site: site, user: user,
                                  states: {adds: initial_states}},
                                 cb);
                             });
                         }
                         else {
                           this.all(trans.objectStore('tasks')
                                    .index('board').openCursor(this.model.name),
                                    (tasks) => {
                                      this.update(
                                        trans,
                                        {
                                          board: board,
                                          site: site,
                                          user: user,
                                          states: {adds: states},
                                          tasks: {adds: tasks}
                                        },
                                        cb);
                                    });
                         }
                       });
            });
          });
        });
    });
  }
  
  _state_status(state) {
    return state.working ? 'w': state.complete? 'c': '';
  }

  set_event_status(event, task) {
    if (task.state.complete) {
      event.complete = true;
    }
    else {
      if (task.state.working) {
        if (task.state.task) {
          this.assert_(task.parent);
          if (task.parent.state.explode) {
            event.working = true;
          }
        }
        else {
          event.working = true;
        }
      }
    }
  }

  add_project(props, cb) {
    let state_id = props.state_id;
    if (! state_id) {
      state_id = this.model.default_project_state_id;
    }
    let state = this.model.states_by_id[state_id];
    this.assert_(state, 'valid state id');
    this.assert_(! state.task, 'valid project state');
    const project = {
      id: uuid(),
      board: this.model.name,
      title: props.title,
      description: props.description,
      state: state,
      order: this.model.order(undefined, true)
    };
    const event = {start: now(), state: state_id};
    this.set_event_status(event, project);
    project.state = state_id;
    project.history = [event];
    this.transaction('tasks', 'readwrite', (trans) => {
      this.r(trans.objectStore('tasks').add(project), () => {
        this.update(trans, {tasks: {adds: [project]}}, cb);
      }, cb);
    }, cb);
  }

  add_task(props, cb) {
    let state_id = props.state_id;
    if (! state_id) {
      state_id = this.model.default_task_state_id;
    }
    let state = this.model.states_by_id[state_id];
    this.assert_(state, 'valid state id');
    this.assert_(state.task, 'valid task state');
    const task = {
      id: uuid(),
      board: this.model.name,
      parent: this.model.tasks[props.project_id],
      title: props.title,
      description: props.description,
      size: props.size,
      blocked: props.blocked,
      assigned: props.assigned,
      order: this.model.order(undefined, true),
      state: state
    };
    const event = {start: now(), state: state_id, assigned: props.assigned};
    this.set_event_status(event, task);
    task.state = state_id;
    task.history = [event];
    task.parent = props.project_id;
    this.transaction('tasks', 'readwrite', (trans) => {
      this.r(trans.objectStore('tasks').add(task), () => {
        this.update(trans, {tasks: {adds: [task]}}, cb);
      }, cb);
    }, cb);
  }

  update_task(id, props, cb) {
    this.transaction('tasks', 'readwrite', (trans) => {
      const tasks = trans.objectStore('tasks');
      this.r(tasks.get(id), (task) => {
        task.title = props.title;
        task.description = props.description;
        if (props.size !== undefined) {
          task.size = props.size;
        }
        if (props.blocked !== undefined) {
          task.blocked = props.blocked;
        }
        if (props.assigned !== undefined) {
          task.assigned = props.assigned;
          task.history[task.history.length - 1].assigned = props.assigned;
        }
        this.r(tasks.put(task), () => {
          this.update(trans, {tasks: {adds: [task]}}, cb);
        }, cb);
      }, cb);
    }, cb);
  }

  _move(trans, tasks, task, parent_id, state_id, before_id, cb) {
    task.order = this.model.order(before_id);
    task.parent = parent_id;
    task.state = state_id;
    this.r(tasks.put(task), () => {
      this.update(trans, {tasks: {adds: [task]}}, cb);
    }, cb);
  }
  
  move(task_id, parent_id, state_id, before_id, cb) {
    this.transaction('tasks', 'readwrite', (trans) => {
      const tasks = trans.objectStore('tasks');
      this.r(tasks.get(task_id), (task) => {
        if (parent_id) {
          this.r(tasks.get(parent_id), (parent) => {
            if (parent.parent != undefined) {
              throw "can't move task into a (sub)task";
            }
            if (! task.parent) {
              // We're demoting a project to a task. Make sure it has
              // no children
              if (this.model.tasks[task.id].count) {
                throw "can't demote project to task if it has children";
              }
            }
            if (state_id && ! this.model.states_by_id[state_id].task) {
              throw "Invalid move-to state: project state with parent task";
            }
            this._move(trans, tasks, task, parent_id, state_id, before_id, cb);
          }, cb);
        }
        else {
          if (state_id && this.model.states_by_id[state_id].task) {
            throw "Invalid move-to state: task state without parent task";
          }
          this._move(trans, tasks, task, parent_id, state_id, before_id, cb);
        }
      }, cb);
    }, cb);
  }
};
