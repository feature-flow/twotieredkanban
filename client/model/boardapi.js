import APIBase from './apibase';
import {Board} from './board';

module.exports = class extends APIBase {
  
  constructor(view, name) {
    super(new Board(name), view, '/board/' + name + '/');
  }
  
  add_board(name, title='', description='') {
    this.post('/site/boards',
              {name: name, title: title, description: description});
  }

  add_project(title, description) {
    this.post('projects',
              {title: title, description: description,
               order: this.model.order(undefined, true)});
  }

  update_project(id, title, description) {
    this.put('projects/' + id,
              {title: title, description: description,
               order: this.model.order()});
  }

  move(task_id, parent_id, state_id, before_id) {
    const order = this.model.order(before_id);
    this.put(`move/${task_id}`,
             {state: state_id, parent_id: parent_id, order: order});
  }
};
