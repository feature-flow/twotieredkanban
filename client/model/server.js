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
        this.model.update(updates.site);
        this.config.headers['x-generation'] = updates.generation;
        this.generation = updates.generation;
        this.view.setState(this.model);
      }
    }
  }

  post(url, data) {
    axios.post(this.base + url, data, this.config).catch((error) => {
      console.log(error);
    });
  }

  get(url, data) {
    axios.get(this.base + url, this.config).catch((error) => {
      console.log(error);
    });
  }

  poll() {
    this.get('poll');
  }

};
