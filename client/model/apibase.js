import axios from 'axios';
import Raven from 'raven-js';

import version from '../version.js';

const CancelToken = axios.CancelToken;

export class APIBase {

  constructor(model, view, base) {
    this.model = model;
    this.view = view;
    this.base = base;
    this.generation = 0;
    this.config = {
      transformRequest: axios.defaults.transformRequest.concat(
        [(data) => this.transform_request(data)]),
      transformResponse: [(data) => this.transform_response(data)],
      responseType: 'json',
      headers: {'x-generation': this.generation}
    };
    
    this.calls = -1;            // -1 to account for long poll
  }

  start() {
    if (! this.active) {
      this.poll_route = 'poll';
      this.active = true;
      this.poll();
    }
  }

  stop() {
    this.active = false;
    if (this.cancel) {
      this.cancel();
      this.cancel = undefined;
      console.log('cancel');
    }
  }

  raven(err) {}

  transform_request(data) {
    this.calls += 1;
    if (this.calls == 1) {
      this.view.setState({calls: this.calls});
    }
    return data;
  }
  
  transform_response(data) {
    this.calls -= 1;
    if (this.calls == 0) {
      this.view.setState({calls: this.calls});
    }

    if (data && data.updates) {
      const updates = data.updates;
      if (updates.generation > this.generation) {
        this.model.update(updates);
        if (updates.user && this.ravonic) {
            Raven.setUserContext({email: updates.user.email,
                                  id: updates.user.id});
        }
        if (updates.raven) {
          updates.raven.options.release = version;
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
    return data;
  }

  handle_error(err) {
    if (err.request || err.response) {
      console.log(err);
      if (err.message != "Network Error") {
        this.raven(err);
      }
    }
    this.transform_response({});
    throw err;
  }

  get(url, data) {
    return axios.get(url[0] == '/' ? url : this.base + url, this.config)
      .catch((e) => this.handle_error(e));
  }

  poll() {
    if (this.active) {
      console.log(this.poll_route);
      let config = this.config;
      if (this.poll_route == 'longpoll') {
        config = Object.assign({
          cancelToken: new CancelToken((c) => {
            this.cancel = c;
          })
        }, config);
      }
      axios.get(this.base + this.poll_route, config)
        .catch((e) => {
          if (axios.isCancel(e)) {
            this.transform_response({});
            console.log('Request canceled', e.message);
          }
          else {
            this.handle_error(e);
          }
        })
        .then(() => {
          this.poll_route = 'longpoll';
          this.poll();
        })
        .catch((err) => {
          console.log(this.poll_route, "failed", err);
          setTimeout(() => this.poll(), 9999);
          if (err.response && err.response.status === 404) {
            this.model.NotFound = true;
            this.view.setState({model: this.model});
          }
        });
    }
  }

  delete(url) {
    return axios.delete(url[0] == '/' ? url : this.base + url, this.config)
      .catch((e) => this.handle_error(e));
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
