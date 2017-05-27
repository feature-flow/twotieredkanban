import indexedDB from "indexedDB";

const open_request = indexedDB.open("FeatureFlowDemo", 1);
open_request.onupgradeneeded = (ev) => {
  const db = ev.target.result;
  db.createObjectStore('boards', {autoIncrement : true, keyPath: 'name' });
  db.createObjectStore('users',  {autoIncrement : true, keyPath: 'id' });
  db.createObjectStore('states', {autoIncrement : true, keyPath: 'id' })
    .createIndex('board', 'board', {unique: false});
  db.createObjectStore('tasks',  {autoIncrement : true, keyPath: 'id' })
    .createIndex('board', 'board', {unique: false});
};

const opened = new Promise((resolve, reject) => {
  open_request.onerror = (ev) => reject(ev.target.errorCode);
  open_request.onsuccess = (ev) => resolve(ev.target.result);
});

module.exports = class {

  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.opened = opened;
    opened.catch(
      (code) => this.handle_error("Couldn't open feature-flow local database",
                                  code)
    );
    this.poll();
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

  update(data) {
    this.model.update(data);
    this.view.setState({model: this.model});
  }

  boards(trans, f) {
    this.all(trans.objectStore('boards').openCursor(), f);
  }
}
