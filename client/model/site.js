import Server from './server';

class Site {

  constructor() {
    this.boards = [];
  }

  update(data) {
    this.boards = data.site.boards;
  }
    
}

module.exports = class extends Server {
  
  constructor(view) {
    super(new Site(), view, '/site/');
  }

  add_board(name) {
    this.post('boards', {name: name, title: '', description: ''});
  }

};
