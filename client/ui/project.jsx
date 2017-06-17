import React from 'react';
import {Card, CardText, IconButton} from 'react-toolbox';
import RichTextEditor from 'react-rte';

import {Dialog, DialogBase, Input, Editor} from './dialog';
import {AddTask, Task, TaskBoard, TaskColumn} from './tasks';

class ProjectDialog extends DialogBase {
  
  render() {
    const action = this.props.action;
    
    return (
      <Dialog title={this.action() + " feature"} action={action} ref="dialog"
              finish={() => this.finish(this.state)} type="large">
        <Input label='Title' required={true} onChange={this.required("title")}
               />
        <Editor onChange={this.val("description")} />
      </Dialog>
    );
  }
}

class AddProject extends ProjectDialog {

  action() { return "Add"; }

  show() {
    super.show({description: RichTextEditor.createEmptyValue()});
  }

  finish(data) {
    this.props.api.add_project({
      title: data.title,
      description: data.description.toString('html')
    });
  }
  
}

class EditProject extends ProjectDialog {

  action() { return "Edit"; }

  show() {
    const project = this.props.project;
    super.show({
      id: project.id,
      title: project.title,
      description:
      RichTextEditor.createValueFromString(project.description, 'html')
    });
  }

  finish(data) {
    this.props.api.update_task(data.id, {
      title: data.title,
      description: data.description.toString('html')
    });
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
    const {project, api, board} = this.props;
    const add = () => {};
    return (
      <span className="icons">
        <AddTask     ref="add" project={project} board={board} api={api} />
        <EditProject ref="edit" project={project} api={api} />
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
  
  more() {
    const {api, board, project} = this.props;
    
    if (this.props.project.state.explode) {
      return <TaskBoard project={project} board={board} api={api} />;
    }
    else if (this.state.expanded) {
      return (
        <div>
          <TaskColumn
               project={project}
               state={{}}
               tasks={project.subtasks()}
               board={board}
               api={api}
             />
          {this.add_edit()}
        </div>
      );
    }
    else {
      return null;
    }
  }
  
  render () {
    const {project} = this.props;
    this.rev = project.rev;
    
    return (
      <Card className="kb-project">
        <CardText>
          {project.title} [{project.total_completed}/{project.total_size}]
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
