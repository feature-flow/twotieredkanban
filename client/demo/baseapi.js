import indexedDB from "indexedDB";

import default_states from './model.json';
import sample from "./sample.json";

const dbname = "FeatureFlowDemo";
let open_request = null;
let opened = null;

const state = (board, order, props) => {
  const s = {board: board, order: order, explode: false,
             working: false, complete: false, task: false};
  Object.assign(s, typeof props == 'string'? {title: props} : props);
  s.id = s.id || s.title;
  s.key = [board, s.id];
  return s;
};

const board_states = (name) => {
  let order = -1;
  return default_states.map((props) => {
    order += 1;
    return state(name, order, props);
  });
};

const populate_store = (store, data) => {
  data.forEach((record) => { store.add(record); });
};

let open_database = () => {
  open_request = indexedDB.open(dbname, 2);
  open_request.onupgradeneeded = (ev) => {
    const db = ev.target.result;
    if (ev.oldVersion < 1) {
      const boards = db.createObjectStore('boards', {keyPath: 'name' });
      db.createObjectStore('users',  {keyPath: 'id' });
      db.createObjectStore('states', {keyPath: 'key' })
        .createIndex('board', 'board', {unique: false});

      db.createObjectStore('tasks',  {keyPath: 'id' })
        .createIndex('board', 'board', {unique: false});

      boards.transaction.oncomplete = () => {
        const trans = db.transaction(['boards', 'users', 'states', 'tasks'],
                                     'readwrite');
        populate_store(trans.objectStore('users'), sample.users);
        populate_store(trans.objectStore('boards'), sample.boards);
        sample.boards.forEach((board) => {
          populate_store(trans.objectStore('states'),
                         board_states(board.name));
        });
        populate_store(trans.objectStore('tasks'), sample.tasks);
      };
    }
    if (ev.oldVersion < 2) {
      db.createObjectStore('archive', {keyPath: 'id' })
          .createIndex('board', 'board', {unique: false});

    }
  };
  
  opened = new Promise((resolve, reject) => {
    open_request.onerror = (ev) => {
      console.log("wtfopen", ev.target.errorCode);
      reject(ev.target.errorCode);
    };
    open_request.onsuccess = (ev) => resolve(ev.target.result);
  });
};
open_database();

module.exports = {
  board_states: board_states,
  BaseAPI: class {

    constructor(model, view, cb) {
      this.model = model;
      this.view = view;
      this.opened = opened;
      opened.catch(
        (code) => this.handle_error(
          "Couldn't open feature-flow local database",
          code)
      );
      this.poll(cb);
    }

    start() {}
    stop() {}

    assert_(cond, message) {
      if (! cond) {
        throw new Error('Assertion failed: ' + message);
      }
    }
    
    static test_reset(cb) {
      open_request.result.close();
      indexedDB.deleteDatabase(dbname).onsuccess = () => {
        open_database();
        cb();
      };
    }

    handle_error(err) {
      console.log(err);
      alert(err);
    }

    r(request, f, cb) {
      request.onsuccess = (ev) => {
        try {
          f(ev.target.result);
        }
        catch (err) {
          this.handle_error(err);
          if (cb) {
            cb(err);
          }
        }
      };
      request.onerror = (ev) => {
        this.handle_error(ev);
        if (cb) {
          cb(ev);
        }
      };
    }

    all(request, f, cb) {
      const results = [];
      request.onsuccess = (ev) => {
        const cursor = ev.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        }
        else {
          try {
            f(results);
          }
          catch (err) {
            this.handle_error(err);
            if (cb) {
              cb(err);
            }
          }
        }
      };
      request.onerror = (ev) => {
        this.handle_error(ev);
        if (cb) {
          cb(ev);
        }
      };
    }

    chain(funcs, cb) {
      if (funcs.length == 0) {
        if (cb) {
          cb(); // done
        }
      }
      else {
        funcs[0](() => {
          this.chain(funcs.splice(1), cb);
        });
      }
    }

    poll() {
      return this.opened.then((db) => {
        this.db = db;
        return db;
      });
    }

    transaction(stores, mode, f, cb) {
      const trans = this.db.transaction(stores, mode);
      trans.onerror = (ev) => {
        this.handle_error(ev);
        if (cb) {
          cb(ev);
        }
      };
      try {
        f(trans);
      }
      catch (err) {
        this.handle_error(err);
        if (cb) {
          cb(err);
        }
      }
    }

    update(trans, data, cb) {
      trans.oncomplete = () => {
        if (data) {
          if (data.user) {
            this.user = data.user;
          }
          this.model.update(data);
        }
        else {
          this.model.NotFound = true;
        }
        this.view.setState({model: this.model});
        if (cb) {
          cb(this, data);
        }
      };
    }

    boards(trans, f) {
      this.all(trans.objectStore('boards').openCursor(), f);
    }

    users(trans, f) {
      this.all(trans.objectStore('users').openCursor(), (users) => {
        const user = users.filter((u) => u.current)[0];
        f(users, user);
      });
    }

    switch_user(uid, cb) {
      this.transaction('users', 'readwrite', (trans) => {
        const users = trans.objectStore('users');
        this.r(users.get(this.user.id), (user) => {
          user.current = false;
          this.r(users.put(user), () => {
            this.r(users.get(uid), (user) => {
              user.current = true;
              this.r(users.put(user), () => {
                this.update(trans, {user: user}, cb);
              });
            });
          });
        });
      });
    }

    update_profile(data, cb) {
      if (data.id !== this.user.id) {
        this.handle_error("update_profile: Invalid user id");
      }
      else {
        const user =
                Object.assign(
                  Object.assign({}, this.user),
                  {name: data.name, nick: data.nick, email: data.email});
        this.transaction('users', 'readwrite', (trans) => {
          this.r(trans.objectStore('users').put(user), () => {
            this.users(trans, (users, user) => {
              this.update(trans, {user: user, site: {users: users}}, cb);
            });
          });
        });
      }
    }
    
    add_board(name, cb) {
      this.transaction('boards', 'readwrite', (trans) => {
        const store = trans.objectStore('boards');

        this.all(store.openCursor(name), (boards) => {
          if (boards.length > 0) {
            this.handle_error("There is already a board named " + name);
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

  }
};
