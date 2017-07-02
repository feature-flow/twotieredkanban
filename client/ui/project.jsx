import React from 'react';
import {Card, CardActions, CardText} from 'react-toolbox/lib/card';
import RichTextEditor from 'react-rte';

import {has_text} from '../model/hastext';

import {Confirm, Dialog, DialogBase, Input, Editor} from './dialog';
import {Reveal, Revealable, RevealButton} from './revealbutton';
import {AddTask, Task, TaskBoard, TaskColumn} from './tasks';
import {TooltipIconButton} from './util';

class ProjectDialog extends DialogBase {
  
  render() {
    const action = this.action();
    
    return (
      <Dialog title={this.action() + " feature"} action={action} ref="dialog"
              finish={() => this.finish(this.state)} type="large">
        <Input label='Title' required={true} onChange={this.required("title")}
               ref="focus" />
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

class Project extends Revealable {

  shouldComponentUpdate(nextProps, nextState) {
    return (nextProps.project.rev !== this.rev ||
            nextState.expanded !== this.state.expanded);
  }

  details() {
    if (has_text(this.props.project.description)) {
      return (
        <CardText
           dangerouslySetInnerHTML={{__html: this.props.project.description}}
          />
      );
    }
    return null;
  }

  actions() {
    const {project, api, board} = this.props;
    return (
      <CardActions>
        <TooltipIconButton
          icon="delete_forever"
          onMouseUp={
            () => this.refs.delete.show({title: project.title})
          }
          tooltip="Delete this feature." tooltipPosition="right"
          />
        <Confirm ref="delete"
                 text={(<div>
                          <p>
                            Are you sure you want to delete {project.title}?
                          </p>
                          <p className="kb-warning">
                            This cannot be undone. Consider putting this
                            feature in The Bag instead.
                            </p>
                        </div>)}
                 finish={() => api.remove(project.id)}
                 />
        <TooltipIconButton
           icon="add"
           onMouseUp={() => this.refs.add.show() }
           tooltip="Add a task to this feature." tooltipPosition="right"
          />
        <AddTask     ref="add" project={project} board={board} api={api} />
        <TooltipIconButton
          icon="mode_edit"
          onMouseUp={() => this.refs.edit.show()}
          tooltip="Edit this feature." tooltipPosition="right"
          />
        <EditProject ref="edit" project={project} api={api} />
      </CardActions>
    );
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
          <h1>
            {project.title} [{project.total_completed}/{project.total_size}]
          </h1>
          <RevealButton
             expanded={this.state.expanded}
             toggle={this.toggle_explanded.bind(this)}
             />
        </CardText>
        <Reveal expanded={this.state.expanded}>
          {this.details()}
          {this.actions()}
        </Reveal>
        {this.tasks()}
      </Card>);
  }

}

module.exports = {
  Project: Project,
  AddProject: AddProject
};
