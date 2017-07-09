import uuid from 'uuid/v1';

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

  add_user(email, name, admin, cb) {
    this.transaction('users', 'readwrite', (trans) => {
      const users_store = trans.objectStore('users');
      this.r(users_store.add(
        {id: uuid(), email: email, name: name, admin: admin, nick:''}), () => {
          this.all(users_store.openCursor(), (users) => {
            this.update(trans, {site: {users: users}}, cb);
          }, cb);
        }, cb);
    }, cb);
  }

  change_user_type(uid, admin, cb) {
    this.transaction('users', 'readwrite', (trans) => {
      const users_store = trans.objectStore('users');
      this.r(users_store.get(uid), (user) => {
        user.admin = admin;
        this.r(users_store.put(user), () => {
          this.all(users_store.openCursor(), (users) => {
            this.update(trans, {site: {users: users}}, cb);
          }, cb);
        }, cb);
      }, cb);
    }, cb);
  }

  get_requests(f) {
    setTimeout(() => f([]), 10);
  }
};
