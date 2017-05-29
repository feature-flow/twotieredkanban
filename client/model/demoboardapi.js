import uuid from 'uuid/v1';

import APIBase from './demoapibase';
import {Board} from './board';
import default_states from './model.json';




const state = (order, props) => {
  const s = {order: order, explode: false,
             working: false, complete: false, task: false};
  Object.assign(s, typeof props == 'string'? {title: props} : props);
  s.id = s.id || s.title;
  return s;
};

module.exports = class extends APIBase {

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
      this.transaction(['boards', 'states', 'tasks'], 'readwrite', (trans) => {
        this.boards(trans, (boards) => {
          const board = Object.assign({}, boards.filter(
            (board) => board.name == this.model.name)[0]);
          board.site = {boards: boards};
          this.all(trans.objectStore('states').openCursor(), (states) => {
            if (states.length == 0) {
              // new board, initialize states
              let order = -1;
              const initial_states = default_states.map((props) => {
                order += 1;
                return state(order, props);
              });
              this.add_all(trans.objectStore('states'), initial_states, () => {
                this.update(
                  trans,
                  {board: board, states: {adds: initial_states}},
                  cb);
              });
            }
            else {
              this.all(trans.objectStore('tasks').openCursor(), (tasks) => {
                this.update(
                  trans,
                  {board: board, states: {adds: states}, tasks: {adds: tasks}},
                  cb);
              });
            }
          });
        });
      });
    });
  }

  add_project(title, description, cb) {
    this.transaction('tasks', 'readwrite', (trans) => {
      const project = {
        id: uuid(),
        title: title,
        description: description,
        order: this.model.order(undefined, true)
      };
      this.r(trans.objectStore('tasks').add(project), () => {
        this.update(trans, {tasks: {adds: [project]}}, cb);
      }, cb);
    }, cb);
  }

  add_task(project_id, title, description, size, blocked, cb) {
    this.transaction('tasks', 'readwrite', (trans) => {
      const task = {
        id: uuid(),
        parent: project_id,
        title: title, description: description, size: size, blocked: blocked,
        order: this.model.order(undefined, true)
      };
      this.r(trans.objectStore('tasks').add(task), () => {
        this.update(trans, {tasks: {adds: [task]}}, cb);
      }, cb);
    }, cb);
  }

  update_task(id, title, description, size, blocked, cb) {
    this.transaction('tasks', 'readwrite', (trans) => {
      const tasks = trans.objectStore('tasks');
      this.r(tasks.get(id), (task) => {
        task.title = title;
        task.description = description;
        if (size !== undefined) {
          task.size = size;
        }
        if (blocked !== undefined) {
          task.blocked = blocked;
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
