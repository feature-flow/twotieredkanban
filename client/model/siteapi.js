import APIBase from './apibase';
import {Site} from './site';

module.exports = class extends APIBase {
  constructor(view) {
    super(new Site(), view, '/site/');
  }

  add_board(name) {
    this.post('boards', {name: name, title: '', description: ''});
  }
};
