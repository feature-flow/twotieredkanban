import React from 'react';
import {Card, CardText, IconButton} from 'react-toolbox';

import {Dialog, DialogBase, Input} from './dialog';
import {AddTask, Task, TaskBoard} from './tasks';

class ProjectDialog extends DialogBase {
  
  render() {
    const action = this.props.action;
    
    return (
      <Dialog title={this.action() + " project"} action={action} ref="dialog"
              finish={() => this.finish(this.state)}>
        <Input label='Title' required={true} onChange={this.val("title")} />
        <Input label='Description' multiline={true}
               onChange={this.val("description")} />
      </Dialog>
    );
  }
}

class AddProject extends ProjectDialog {

  action() { return "Add"; }

  finish(data) {
    this.props.api.add_project(data.title, data.description);
  }
  
}

class EditProject extends ProjectDialog {

  action() { return "Edit"; }

  show() {
    const project = this.props.project;
    super.show({id: project.id,
                title: project.title,
                description: project.description});
  }

  finish(data) {
    this.props.api.update_task(data.id, data.title, data.description);
  }

}

class Project extends React.Component {

  constructor(props) {
    super(props);
    this.state = {expanded: false};
  }

  shouldComponentUpdate(nextProps, nextState) {
    return (nextProps.project.rev !== this.rev ||
            nextState.expanded !== this.state.expanded);
  }

  add_edit() {
    const add = () => {};
    return (
      <span className="icons">
        <AddTask     project={this.props.project}
                     ref="add" api={this.props.api} />
        <EditProject project={this.props.project}
                     ref="edit" api={this.props.api} />
        <IconButton icon="add"       onMouseUp={() => this.refs.add.show() } />
        <IconButton icon="mode_edit" onMouseUp={() => this.refs.edit.show()} />
      </span>
    );
  }

  icons() {
    if (this.props.project.state.explode) {
      return this.add_edit();
    }
    else if (this.state.expanded) {
      const contract = () => this.setState({expanded: false});
      return (
        <span className="icons">
          <IconButton icon="arrow_drop_up" onMouseUp={contract} />
        </span>
      );
    }
    else {
      const expand = () => this.setState({expanded: true});
      return (
        <span className="icons">
          <IconButton icon="arrow_drop_down" onMouseUp={expand} />
        </span>
      );
    }
  }

  tasks() {
    return this.props.project.subtasks().map((task) => {
      return (
        <Task task={task} key={task.id} />
      );
    });
  }
  
  more() {
    if (this.props.project.state.explode) {
      return <TaskBoard project={this.props.project} api={this.props.api} />;
    }
    else if (this.state.expanded) {
      return (
        <div>
          {this.tasks()}
          {this.add_edit()}
        </div>
      );
    }
    else {
      return null;
    }
  }
  
  render () {
    this.rev = this.props.project.rev;

    const add_project = (data) => {
      this.props.api.add_task(
        data.title, data.description);
    };
    
    return (
      <Card>
        <CardText>
          {this.props.project.title}
          {this.icons()}
        </CardText>
        {this.more()}
      </Card>);
  }

}

module.exports = {
  Project: Project,
  AddProject: AddProject
};
