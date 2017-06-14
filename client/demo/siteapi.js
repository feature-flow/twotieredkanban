import {Site} from '../model/site';

import {BaseAPI} from './baseapi';

module.exports = class extends BaseAPI {

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
};
