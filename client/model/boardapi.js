import APIBase from './apibase';
import {Board} from './board';

module.exports = class extends APIBase {
  
  constructor(view, name) {
    super(new Board(), view, '/board/' + name + '/');
  }
  
  add_board(name, title='', description='') {
    this.post('/site/boards',
              {name: name, title: title, description: description});
  }

  add_project(title, description) {
    this.post('projects',
              {title: title, description: description,
               order: this.model.order()});
  }

  update_project(id, title, description) {
    this.put('projects/' + id,
              {title: title, description: description,
               order: this.model.order()});
  }

  
};
