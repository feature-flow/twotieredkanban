import APIBase from './apibase';
import {Board} from './board';

module.exports = class extends APIBase {
  
  constructor(view, name) {
    super(new Board(name), view, '/board/' + name + '/');
  }

  add_project(props) {
    this.post('projects',
              {title: props.title, description: props.description,
               order: this.model.order(undefined, true)});
  }

  add_task(props) {
    this.post('project/' + props.project_id, {
      title: props.title,
      description: props.description,
      size: props.size,
      blocked: props.blocked,
      assigned: props.assigned,
      order: this.model.order(undefined, true)
    });
  }

  update_task(id, props) {
    this.put('tasks/' + id, {
      title: props.title,
      description: props.description,
      size: props.size,
      blocked: props.blocked,
      assigned: props.assigned
    });
  }

  move(task_id, parent_id, state_id, before_id) {
    const order = this.model.order(before_id);
    this.put(`move/${task_id}`,
             {state_id: state_id, parent_id: parent_id, order: order});
  }
};
