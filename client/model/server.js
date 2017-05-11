import axios from 'axios';

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
    this.poll();
  }

  transform_response(data) {
    if (data.updates) {
      const updates = data.updates;
      if (updates.generation > this.generation) {
        this.model.update(updates);
        this.config.headers['x-generation'] = updates.generation;
        this.generation = updates.generation;
        this.view.setState({model: this.model});
      }
    }
  }

  handle_error(err) {
    if (err.request || err.response) {
      console.log(err);
    }
    else {
      throw err;
    }
  }

  get(url, data) {
    axios.get(this.base + url, this.config).catch((e) => this.handle_error(e));
  }

  poll() {
    this.get('poll');
  }

  post(url, data) {
    axios.post(url[0] == '/' ? url : this.base + url,
               data, this.config).catch((e) => this.handle_error(e));
  }

  put(url, data) {
    axios.put(url[0] == '/' ? url : this.base + url,
               data, this.config).catch((e) => this.handle_error(e));
  }

};
