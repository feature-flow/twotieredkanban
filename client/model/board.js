class TaskContainer {

  constructor() {
    this.total_size = 0;
    this.total_completed = 0;
    this.count = 0;
    this.subtasks_by_state = {}; // state_id -> [task]
    this.rev = 0;
  }

  subtasks(state) {
    if (! this.subtasks_by_state[state]) {
      this.subtasks_by_state[state] = [];
    }
    return this.subtasks_by_state[state];
  }

  add_subtask(task) {
    this.subtasks(task.state.id).push(task);
    this.subtasks().push(task);
    this.update_stats();
    this.rev += 1;
  }

  ar_remove(list, element) {
    return list.splice(list.indexOf(element), 1);
  }

  remove_subtask(task) {
    this.ar_remove(this.subtasks(task.state.id), task);
    this.ar_remove(this.subtasks(), task);
    this.update_stats();
    this.rev += 1;
  }

  update_stats() {
    this.total_completed = 0;
    this.total_size = 0;
    this.count = 0;
    this.subtasks().forEach((task) => {
      this.count += 1;
      this.total_size += task.size;
      if (task.history[task.history.length - 1].complete) {
        this.total_completed += task.size;
      }
    });
  }

  cmp_order(a, b) {
    return a.order < b.order ? -1 : (a.order > b.order ? 1 : 0);
  }

  sort(state) {
    this.subtasks(state).sort(this.cmp_order);
    this.subtasks().sort(this.cmp_order);
  }
}

class Task extends TaskContainer {

  constructor(id, props) {
    super();
    this.id = id;
    this.title = props.title;
    this.description = props.description;
    this.state = props.state;
    this.order = props.order;
    this.blocked = props.blocked;
    this.assigned = props.assigned;
    this.size = props.size || 1;
    this.complete = props.complete;
    this.parent = props.parent;
    this.history = props.history;
  }

  update(task) {
    this.title = task.title;
    this.description = task.description;
    this.blocked = task.blocked;
    this.created = task.created;
    this.assigned = task.assigned;
    this.user = task.user;
    this.size = task.size;
    this.complete = task.complete;
    this.parent = task.parent;
    this.state = task.state;
    this.order = task.order;
    this.history = task.history;

    // Give React a little help:
    this.rev += 1;
    if (this.parent) {
      this.parent.rev += 1;
    }
  }
}

class Board extends TaskContainer {

  constructor(name) {
    super();
    this.name = name;
    this.title = '';
    this.description = '';
    this.boards = [];
    this.users = [];
    this.users_by_id = {};
    this.user = {email: ''};

    this.tasks = {}; // {id -> task} for all tasks
    this.all_tasks = [];

    this.states = [];
    this.project_states = [];
    this.task_states = [];
    this.states_by_id = {}; // {id -> state
    this.archive_count = 0;

    this.search = {}; // Search results
  }

  add_task(task) {
    const old = this.tasks[task.id];
    let add = true;
    let sort = true;

    task.state = this.states_by_id[task.state];
    if (! task.state) {
      console.log(`Invalid state id ${task.state} for ${task.id}`);
      task.state = this.states_by_id[
        task.parent ?
          this.default_task_state_id :
          this.default_project_state_id];
    }
    if (task.assigned) {
      task.user = this.users_by_id[task.assigned];
    }
    
    if (old) {
      if (task.parent != old.parent || task.state.id != old.state.id) {
        (old.parent ? old.parent : this).remove_subtask(old);
      }
      else {
        add = false;
        sort = task.order != old.order;
      }
      old.update(task);
      task = old;
    }
    else {
      this.tasks[task.id] = task;
      this.all_tasks.push(task);
    }

    const parent = task.parent ? task.parent : this;
    if (add) {
      parent.add_subtask(task);
    }
    else {
      parent.update_stats();
    }
    
    if (sort) {
      parent.sort(task.state.id);
    }

    parent.rev += 1;
  }

  update(updates) {
    if (updates.board) {
      if (updates.board.title != undefined) {
        this.title = updates.board.title;
      }
      if (updates.board.description != undefined) {
        this.description = updates.board.description;
      }
      if (updates.board.archive_count != undefined) {
        this.archive_count = updates.board.archive_count;
        delete this.search.archive; // Clear search results
      }
    }

    if (updates.site) {
      Object.assign(this, updates.site);
      this.users_by_id = {};
      this.users.forEach((u) => {
        this.users_by_id[u.id] = u;
      });
    }

    if (updates.user) {
      this.user = updates.user;
    }

    if (updates.states) {
      updates.states.adds.forEach((state) => {
        if (this.states_by_id[state.id]) {
          Object.assign(this.states_by_id[state.id], state);
        }
        else {
          state.substates = this.task_states;
          this.states.push(state);
          this.states_by_id[state.id] = state;
          state.projects = this.subtasks(state.id);
        }
      });
      this.states.sort(this.cmp_order);
      this.project_states = this.states.filter((state) => ! state.task);
      this.task_states.splice(
        0, this.task_states.length,
        ... this.states.filter((state) => state.task)
      );
      this.default_project_state_id = this.project_states[0].id;
      this.default_task_state_id = this.task_states[0].id;
    }

    if (updates.tasks) {
      // TODO: updates.tasks.contents
      if (updates.tasks.adds) {
        updates.tasks.adds.forEach((task) => {
          if (! task.parent) {
            this.add_task(new Task(
              task.id,
              {
                title: task.title,
                description: task.description,
                state: task.state ? task.state : this.default_project_state_id,
                order: task.order,
                history: task.history
              }
            ));
          }
        });

        // tasks
        // Note that we deal with tasks in a second pass so we know
        // projects are in place.
        updates.tasks.adds.forEach((task) => {
          if (task.parent) {
            this.add_task(
              new Task(
                task.id,
                {
                  title: task.title,
                  description: task.description,
                  state: task.state ? task.state : this.default_task_state_id,
                  order: task.order,
                  blocked: task.blocked,
                  assigned: task.assigned,
                  size: task.size,
                  history: task.history,
                  parent: this.tasks[task.parent]
                }
              ));
          }
        });

        this.all_tasks.sort(this.cmp_order);
      }

      if (updates.tasks.removals) {
        updates.tasks.removals.forEach((task_id) => {
          const task = this.tasks[task_id];
          (task.parent || this).remove_subtask(task);
          delete this.tasks['task_id'];
          this.ar_remove(this.all_tasks, task);
        });
      }
    }

    if (updates.search) {
      // Search results flow much like data changes
      Object.assign(this.search, updates.search);
    }
  }

  order(before_id, front) {
    const r = Math.random();
    if (before_id != undefined) {
      const before = this.tasks[before_id];
      const i = this.all_tasks.indexOf(before);
      if (i == 0) {
        return before.order - .5 - r;
      }
      else {
        const d = before.order - this.all_tasks[i - 1].order;
        return before.order - (r * .5 + .25) * d;
      }
    }
    else {
      if (this.all_tasks.length > 0) {
        if (front) {
          return this.all_tasks[0].order - .5 - r;
        }
        else {
          return this.all_tasks.slice(-1)[0].order + .5 + r;
        }
      }
      else {
        return 0;
      }
    }
  }
}

module.exports = {
  Board: Board
};
