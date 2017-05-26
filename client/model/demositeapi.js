import APIBase from './demoapibase';
import {Site} from './site';

module.exports = class extends APIBase {
  constructor(view) {
    super(new Site(), view);
  }

  poll() {
    super.poll().then((db) => {
      this.boards(db.transaction('boards'), (boards) => {
        this.update({site: {boards: boards}});
      });
    });
  }
  
  add_board(name) {
    const store = this.db.transaction(['boards'], 'readwrite')
                         .objectStore('boards');

    this.all(store.openCursor(name), (boards) => {
      if (boards.length > 0) {
        this.handle_error("There is already a board with that name");
      }
      else {
        this.r(store.add({name: name, title: '', description: ''}), () => {
            this.all(store.openCursor(), (boards) => {
              this.update({site: {boards: boards}});
            });
          });
      }
    });
  }
};
