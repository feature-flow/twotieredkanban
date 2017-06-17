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

  set_event_status(event, task, parent_state) {
    // Note that the task is a raw task, with state and parent ids, not objects
    const state = this.model.states_by_id[task.state];
    if (event.working) {
      delete event.working;
    }
    if (state.complete) {
      event.complete = true;
    }
    else {
      if (event.complete) {
        delete event.complete;
      }
      if (state.working) {
        if (state.task) {
          this.assert_(task.parent);
          if ((parent_state || this.model.tasks[task.parent].state).explode) {
            event.working = true;
          }
        }
        else {
          event.working = true;
        }
      }
    }
    event.state = task.state;
    return event;
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
      state: state_id,
      order: this.model.order(undefined, true)
    };
    project.history = [this.set_event_status({start: now()}, project)];
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
      parent: props.project_id,
      title: props.title,
      description: props.description,
      size: props.size,
      blocked: props.blocked,
      assigned: props.assigned,
      order: this.model.order(undefined, true),
      state: state_id
    };
    task.history = [
      this.set_event_status({start: now(), assigned: props.assigned}, task)
    ];
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
  
  move(task_id, parent_id, state_id, before_id, front, cb) {
    this.transaction('tasks', 'readwrite', (trans) => {
      const tasks = trans.objectStore('tasks');
      this.r(tasks.get(task_id), (task) => {
        if (parent_id) {
          this.r(tasks.get(parent_id), (new_parent) => {
            if (new_parent.parent != undefined) {
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
            this._move(trans, tasks, task, parent_id, state_id,
                       before_id, front, cb);
          }, cb);
        }
        else {
          if (state_id && this.model.states_by_id[state_id].task) {
            throw "Invalid move-to state: task state without parent task";
          }
          this._move(trans, tasks, task, parent_id, state_id,
                     before_id, front, cb);
        }
      }, cb);
    }, cb);
  }

  _move(trans, tasks, task, parent_id, state_id, before_id, front, cb) {
    const board = this.model;
    task.order = board.order(before_id, front);
    const update_subtasks_working =
      ! parent_id &&
      ! task.parent &&
      state_id != task.state &&
      board.states_by_id[task.state].explode !=
      board.states_by_id[state_id].explode;
    task.parent = parent_id;
    task.state = state_id;
    const last = task.history[task.history.length - 1];
    const event = this.set_event_status(Object.assign({}, last), task);
    const state = board.states_by_id[state_id];
    if (state.task) {
      if (state.working) {
        task.assigned = this.model.user.id;
        event.assigned = task.assigned;
      }
    }
    else {
      if (event.assigned) {
        delete event.assigned;
      }
    }
    if (event.state !== last.state ||
        event.working !== last.working ||
        event.complete !== last.complete) {
      last.end = now();
      event.start = last.end;
      task.history.push(event);
    }
    this.r(tasks.put(task), () => {
      if (update_subtasks_working) {
        const working_subtask_ids = board.tasks[task.id].subtasks().filter(
          (t) => t.state.working 
        ).map(
          (t) => t.id
        );
        const adds = [task];
        this._update_subtasks_working(
          trans, tasks, working_subtask_ids, adds,
          {explode: board.states_by_id[state_id].explode},
          cb);
      }
      else {
        this.update(trans, {tasks: {adds: [task]}}, cb);
      }
    }, cb);
  }

  _update_subtasks_working(trans, tasks, subtask_ids, adds, parent_state, cb) {
    if (subtask_ids.length > 0) {
      this.r(tasks.get(subtask_ids.pop()), (task) => {
        const last = task.history[task.history.length - 1];
        const event = Object.assign({}, last);
        last.end = now();
        event.start = last.end;
        this.set_event_status(event, task, parent_state);
        task.history.push(event);
        adds.push(task);
        this.r(tasks.put(task),
               () => this._update_subtasks_working(
                 trans, tasks, subtask_ids, adds, parent_state, cb),
               cb);
      }, cb);
    }
    else {
      this.update(trans, {tasks: {adds: adds}}, cb);
    }
  } 
};
