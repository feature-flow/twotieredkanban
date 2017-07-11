import APIBase from './apibase';
import {Board} from './board';

module.exports = class extends APIBase {
  
  constructor(view, name) {
    super(new Board(name), view, '/board/' + name + '/');
  }

  rename(name) {
    this.put('', {name: name});
  }

  add_project(props) {
    this.post('projects',
              {title: props.title, description: props.description,
               order: this.model.order(undefined, true)});
  }

  add_task(props) {
    this.post('project/' + props.project_id, {
      title: props.title,
      description: props.description,
      size: props.size,
      blocked: props.blocked,
      assigned: props.assigned,
      order: this.model.order(undefined, true)
    });
  }

  update_task(id, props) {
    this.put('tasks/' + id, {
      title: props.title,
      description: props.description,
      size: props.size,
      blocked: props.blocked,
      assigned: props.assigned
    });
  }

  remove(id) {
    this.delete('tasks/' + id);
  }

  move(task_id, parent_id, state_id, before_id, front) {
    const order = this.model.order(before_id, front);
    this.put(`move/${task_id}`,
             {state_id: state_id, parent_id: parent_id, order: order});
  }

  archive(feature_id) {
    this.post('archive/' + feature_id, {});
  }

  restore(feature_id) {
    this.delete('archive/' + feature_id);
  }

  get_archived(search, start, size, f) {
    search = search ? '&text=' + encodeURIComponent(search) : '';
    this.get('archive?start=' + start + '&size=' + size + search).then((r) => {
      r.data.start = start;
      this.model.update({search: {archive: r.data}});
      this.view.setState({model: this.model});
    });
  }

  export_url(f) {
    f(this.base + 'export');
  }
};
