class TaskContainer {

  constructor() {
    this.total_size = 0;
    this.total_completed = 0;
    this.count = 0;
    this.subtasks_by_state = {}; // state_id -> [task]
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
  }

  ar_remove(list, element) {
    return list.splice(list.indexOf(element), 1);
  }

  remove_subtask(task) {
    this.ar_remove(this.subtasks(task.state.id), task);
    this.ar_remove(this.subtasks(), task);
    this.update_stats();
  }

  update_stats() {
    this.total_completed = 0;
    this.total_size = 0;
    this.count = 0;
    this.subtasks().forEach((task) => {
      this.count += 1;
      this.total_size += task.size;
      if (task.complete) {
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

  constructor(id, title, description, state, order, blocked, created, assigned,
              size=0, complete=false, parent=null) {
    super();
    this.id = id;
    this.title = title;
    this.description = description;
    this.state = state;
    this.order = order;
    this.blocked = blocked;
    this.created = created;
    this.assigned = assigned;
    this.size = size;
    this.complete = complete;
    this.parent = parent;
    this.rev = 0;
  }

  update(task) {
    this.title = task.title;
    this.description = task.description;
    this.blocked = task.blocked;
    this.created = task.created;
    this.assigned = task.assigned;
    this.size = task.size;
    this.complete = task.complete;
    this.parent = task.parent;
    this.state = task.state;
    this.order = task.order;

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
    this.site = {boards: []};

    this.tasks = {}; // {id -> task} for all tasks
    this.all_tasks = [];

    this.states = [];
    this.project_states = [];
    this.task_states = [];
    this.states_by_id = {}; // {id -> top-level-state

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
      if (updates.board.title) {
        this.title = updates.board.title;
      }
      if (updates.board.description) {
        this.description = updates.board.description;
      }
      if (updates.board.users) {
        this.users = updates.board.users;
      }
      if (updates.board.admins) {
        this.admins = updates.board.admins;
      }
      if (updates.board.site) {
        this.site = updates.board.site;
      }
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
      // TODO: only handling new and updates
      // projects
      updates.tasks.adds.forEach((task) => {
        if (! task.parent) {
          this.add_task(new Task(
            task.id,
            task.title,
            task.description,
            task.state ? task.state : this.default_project_state_id,
            task.order
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
              task.title,
              task.description,
              task.state ? task.state : this.default_task_state_id,
              task.order,
              task.blocked,
              task.created,
              task.assigned,
              task.size,
              task.complete,
              this.tasks[task.parent]
            ));
        }
      });

      this.all_tasks.sort(this.cmp_order);
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
