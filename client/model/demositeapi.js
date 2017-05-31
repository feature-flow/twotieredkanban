import APIBase from './demoapibase';
import {Site} from './site';

module.exports = class extends APIBase {

  constructor(view, cb) {
    super(new Site(), view, cb);
  }

  poll(cb) {
    super.poll().then((db) => {
      this.transaction(['boards', 'users'], 'readonly', (trans) => {
        this.boards(trans, (boards) => {
          this.users(trans, (users, user) => {
            this.update(
              trans,
              {site: {boards: boards, users: users}, user: user},
              cb);
          });
        });
      });
    });
  }
  
  add_board(name, cb) {
    this.transaction('boards', 'readwrite', (trans) => {
      const store = trans.objectStore('boards');

      this.all(store.openCursor(name), (boards) => {
        if (boards.length > 0) {
          this.handle_error("There is already a board with that name");
        }
        else {
          this.r(store.add({name: name, title: '', description: ''}), () => {
            this.all(store.openCursor(), (boards) => {
              this.update(trans, {site: {boards: boards}}, cb);
            });
          });
        }
      });
    });
  }
};
