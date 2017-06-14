import axios from 'axios';
import Raven from 'raven-js';

module.exports = class {

  constructor(model, view, base) {
    this.model = model;
    this.view = view;
    this.base = base;
    this.generation = 0;
    this.config = {
      transformResponse: [(data) => this.transform_response(data)],
      responseType: 'json',
      headers: {'x-generation': this.generation}
    };
    this.poll_route = 'poll';
  }

  start() {
    if (! this.active) {
      this.active = true;
      this.poll();
    }
  }

  stop() {
    this.active = false;
  }

  raven(err) {}

  transform_response(data) {
    if (data && data.updates) {
      const updates = data.updates;
      if (updates.generation > this.generation) {
        this.model.update(updates);
        if (updates.user && this.ravonic) {
            Raven.setUserContext({email: updates.user.email,
                                  id: updates.user.id});
        }
        if (updates.raven) {
          Raven
            .config(updates.raven.url, updates.raven.options)
            .install();
          this.ravonic = true;
          this.raven = (err) => Raven.captureException(err);
          if (this.model.user) {
            Raven.setUserContext({email: this.model.user.email,
                                  id: this.model.user.id});
          }
        }
        this.config.headers['x-generation'] = updates.generation;
        if (updates.zoid) {
          this.config.headers['x-generation-zoid'] = updates.zoid;
        }
        this.generation = updates.generation;
        this.view.setState({model: this.model});
      }
    }
  }

  handle_error(err) {
    if (err.request || err.response) {
      console.log(err);
      if (err.message != "Network Error") {
        this.raven(err);
      }
    }
    else {
      throw err;
    }
  }

  get(url, data) {
    return axios.get(this.base + url, this.config)
      .catch((e) => this.handle_error(e));
  }

  poll() {
    if (this.active) {
      console.log(this.poll_route);
      this.get(this.poll_route)
        .then(() => {
          this.poll_route = 'longpoll';
          this.poll();
        })
        .catch((err) => {
          console.log(this.poll_route, "failed", err);
          setTimeout(() => this.poll(), 9999);
        });
    }
  }

  post(url, data) {
    return axios.post(url[0] == '/' ? url : this.base + url, data, this.config)
      .catch((e) => this.handle_error(e));
  }

  put(url, data) {
    return axios.put(url[0] == '/' ? url : this.base + url, data, this.config)
      .catch((e) => this.handle_error(e));
  }

  add_board(name) {
    this.post('boards', {name: name, title: '', description: ''});
  }
};
