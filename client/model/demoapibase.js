import indexedDB from "indexedDB";

import demosample from "./demosample.json";

const dbname = "FeatureFlowDemo";
let open_request = null;
let opened = null;

let open_database = () => {
  open_request = indexedDB.open(dbname, 1);
  open_request.onupgradeneeded = (ev) => {
    const db = ev.target.result;
    db.createObjectStore('boards', {keyPath: 'name' });

    db.createObjectStore('users',  {keyPath: 'id' })
      .transaction.oncomplete = () => {
        const store = db.transaction('users', 'readwrite').objectStore('users');
        demosample.users.forEach((u) => {
          store.add(u);
        });
      };

    db.createObjectStore('states', {keyPath: 'key' })
      .createIndex('board', 'board', {unique: false});
    db.createObjectStore('tasks',  {keyPath: 'id' })
      .createIndex('board', 'board', {unique: false});
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

module.exports = class {

  constructor(model, view, cb) {
    this.model = model;
    this.view = view;
    this.opened = opened;
    opened.catch(
      (code) => this.handle_error("Couldn't open feature-flow local database",
                                  code)
    );
    this.poll(cb);
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
      this.model.update(data);
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
      const user = users.filter((u) => u.current);
      f(users, user.length > 0 ? user[0] : users[0]);
    });
  }
}
