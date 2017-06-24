import React from 'react';
import {Card, CardActions, CardText} from 'react-toolbox';
import RichTextEditor from 'react-rte';

import {has_text} from '../model/hastext';

import {Dialog, DialogBase, Input, Editor} from './dialog';
import {RevealButton} from './revealbutton';
import {AddTask, Task, TaskBoard, TaskColumn} from './tasks';
import {TooltipIconButton} from './util';

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
  toggle_explanded() {
    this.setState({expanded: ! this.state.expanded});
  }

  details() {
    if (this.state.expanded && has_text(this.props.project.description)) {
      return (
        <CardText
           dangerouslySetInnerHTML={{__html: this.props.project.description}}
          />
      );
    }
    return null;
  }

  actions() {
    if (this.state.expanded) {
      const {project, api, board} = this.props;
      return (
        <CardActions>
          <AddTask     ref="add" project={project} board={board} api={api} />
          <EditProject ref="edit" project={project} api={api} />
          <TooltipIconButton
             icon="add"
             onMouseUp={() => this.refs.add.show() }
             tooltip="Add a task to this feature." tooltipPosition="right"
            />
          <TooltipIconButton
            icon="mode_edit"
            onMouseUp={() => this.refs.edit.show()}
            tooltip="Edit this feature." tooltipPosition="right"
            />
        </CardActions>
      );
    }
    return null;
  }
  
  tasks() {
    const {api, board, project} = this.props;
    
    if (this.props.project.state.explode) {
      return <TaskBoard project={project} board={board} api={api} />;
    }
    if (this.state.expanded) {
      return (
        <TaskColumn
           project={project}
           state={{}}
           tasks={project.subtasks()}
           board={board}
           api={api}
           />
      );
    }
    return null;
  }
  
  render () {
    const {project} = this.props;
    this.rev = project.rev;
    
    return (
      <Card className="kb-project">
        <CardText className="kb-w-right-thing">
          <span>
            {project.title} [{project.total_completed}/{project.total_size}]
          </span>
          <RevealButton
             expanded={this.state.expanded}
             toggle={this.toggle_explanded.bind(this)}
             />
        </CardText>
        {this.details()}
        {this.tasks()}
        {this.actions()}
      </Card>);
  }

}

module.exports = {
  Project: Project,
  AddProject: AddProject
};
