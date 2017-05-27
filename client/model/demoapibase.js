import indexedDB from "indexedDB";

const dbname = "FeatureFlowDemo";
let open_request = null;
let opened = null;

let open_database = () => {
  open_request = indexedDB.open(dbname, 1);
  open_request.onupgradeneeded = (ev) => {
    const db = ev.target.result;
    db.createObjectStore('boards', {autoIncrement : true, keyPath: 'name' });
    db.createObjectStore('users',  {autoIncrement : true, keyPath: 'id' });
    db.createObjectStore('states', {autoIncrement : true, keyPath: 'id' })
      .createIndex('board', 'board', {unique: false});
    db.createObjectStore('tasks',  {autoIncrement : true, keyPath: 'id' })
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

  r(request, f) {
    request.onsuccess = (ev) => f(ev.target.result);
    request.onerror = (e) => this.handle_error(e);
  }

  all(request, f) {
    const results = [];
    request.onsuccess = (ev) => {
      const cursor = ev.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      }
      else {
        f(results);
      }
    };
    request.onerror = (ev) => this.handle_error(ev);
  }

  poll() {
    return this.opened.then((db) => {
      this.db = db;
      return db;
    });
  }

  transaction(stores, mode, cb) {
    const trans = this.db.transaction(stores, mode);
    trans.onerror = (err) => this.handle_error(err);
    cb(trans);
  }

  update(trans, data, cb) {
    trans.oncomplete = () => {
      this.model.update(data);
      this.view.setState({model: this.model});
      if (cb) {
        cb(this);
      }
    };
  }

  boards(trans, f) {
    this.all(trans.objectStore('boards').openCursor(), f);
  }
}
