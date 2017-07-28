import React from 'react';
import classes from 'classnames';
import RichTextEditor from 'react-rte';
import {Card, CardActions, CardText} from 'react-toolbox/lib/card';
import Snackbar from 'react-toolbox/lib/snackbar';

import {has_text} from '../model/hastext';

import {Confirm, Dialog, DialogBase, Editor, Input, Select} from './dialog';
import {Draggable, DropZone} from './dnd';
import {Reveal, Revealable, RevealButton} from './revealbutton';
import {TooltipIconButton, TooltipInput} from './util';
import {UserAvatar, UserSelect} from './who';

const sized = /\s*\[(\d+)\]\s*$/;

class TaskDialog extends DialogBase {

  finish() {
    const match = sized.exec(this.state.title);
    if (match) {
      this.state.title = this.state.title.slice(0, match.index);
      this.state.size = +(match[1]);
    }
    this.save(this.state);
  }

  extra_actions() {
    return null;
  }
  
  render() {
    const action = this.action();

    const source = [1, 2, 3, 5, 8, 13];
    if (source.indexOf(this.state.size) < 0) {
      source.push(this.state.size);
      source.sort((a, b) => a < b ? -1 : (a > b ? 1: 0));
    }
    
    return (
      <Dialog
         title={action + " task"} action={action} ref="dialog"
         finish={() => this.finish()} type="large"
         extra_actions={this.extra_actions()}
        >
        <Input
           label='Title' required={true} onChange={this.required("title")}
           ref="focus"
           onEnter={() => this.on_enter()}
          />
          <span className="kb-input-tip">
            Pressing enter in the title field {this.enter_action()}.
            Ending with a number in square braces sets the size.
          </span>
        <div className="kb-field-row">
          <Select label='Size' source={source}
                  className="kb-task-size"
                  onChange={this.val("size", 1)} />
          <UserSelect label="Assigned" onChange={this.val("assigned")}
                      users={this.props.board.users} none="Unassigned"
                      />
          <Input label='Blocked' multiline={true} className="kb-flex-grow"
                 onChange={this.val("blocked")} />
        </div>
        <Editor onChange={this.val("description")} />
        <Snackbar
           label={this.state.snackbar_label}
           ref='snackbar'
           active={this.state.snackbar_active || false}
           timeout={3333}
           onTimeout={() => this.setState({snackbar_active: false})}
        />
      </Dialog>
    );
  }
}

export class AddTask extends TaskDialog {

  action() { return "Add"; }

  show() {
    super.show({
      title: '',
      description: RichTextEditor.createEmptyValue(),
      size: 1,
      blocked: ''
    });
  }

  on_enter() {
    this.finish(this.state);
    this.show();
  }

  enter_action() {
    return "saves input and adds another";
  }

  save(data) {
    this.props.api.add_task({
      project_id: this.props.project.id,
      title: data.title,
      description: data.description.toString('html'),
      size: parseInt(data.size),
      blocked: data.blocked,
      assigned: data.assigned
    });
    this.setState({snackbar_active: true,
                   snackbar_label: 'Added: ' + data.title});
  }
  
  extra_actions() {
    return [{label: "Add and add another",
             onClick: () => this.on_enter()}];
  }
}

class EditTask extends TaskDialog {

  action() { return "Edit"; }

  show() {
    const task = this.props.task;
    super.show({id: task.id,
                title: task.title,
                description:
                RichTextEditor.createValueFromString(task.description, 'html'),
                size: task.size,
                blocked: task.blocked,
                assigned: task.assigned
               });
  }

  on_enter() {
    this.refs.dialog.hide();
    this.finish(this.state);
  }

  enter_tooltip() {
    return "Press enter to save";
  }

  enter_action() {
    return "saves changes.";
  }

  save(data) {
    this.props.api.update_task(data.id, {
      title: data.title,
      description: data.description.toString('html'),
      size: parseInt(data.size),
      blocked: data.blocked,
      assigned: data.assigned
    });
  }
}


export class TaskBoard extends React.Component {

  column_width(state) {
    return this.props.project.subtasks(state.id).reduce(
      (w, task) => w + Math.min(task.title.length, 12),
      state.title.length);
  }

  render() {

    const {project} = this.props;
    const substates = project.state.substates;
    const undone_states = substates.slice(0, project.state.substates.length -1);

    const columns =
            undone_states.map((state) => {
              if (state.working) {
                return (
                  <UnorderedTaskColumn
                     key={state.id}
                     project={project}
                     state={state}
                     tasks={project.subtasks(state.id)}
                     board={this.props.board}
                     api={this.props.api}
                     />
                );
              }
              else {
                return (
                  <TaskColumn
                     key={state.id}
                     project={project}
                     state={state}
                     tasks={project.subtasks(state.id)}
                     board={this.props.board}
                     api={this.props.api}
                     />
                );
              }
            });

    const done_state = substates[substates.length-1];
    const done_width = this.column_width(done_state);
    const total_width = undone_states.reduce(
      (w, state) => w + this.column_width(state),
      done_width);
    const width_percent =
      Math.min(40, Math.max(20, Math.round(done_width*100/total_width))) + '%';
    const size = undone_states.reduce(
      (w, state) => w + project.subtasks(state.id).length,
      0);
    const className = classes('kb-table', {'kb-empty': ! size});
    const done = (
      <UnorderedTaskColumn
         key={done_state.id}
         project={project}
         state={done_state}
         tasks={project.subtasks(done_state.id)}
         board={this.props.board}
         api={this.props.api}
         style={{width: width_percent}}
         />
    );

    return (
      <div className="kb-task-board">
        <div className={className} style={{paddingRight: width_percent}}>
          {columns}
        </div>
        {done}
      </div>
    ); 
  }
}

export class TaskColumn extends React.Component {

  dropped(dt, before_id) {
    this.props.api.move(
      dt.getData('text/id'), // id of task to be moved
      this.props.project.id, // id of destination project
      this.props.state.id,   // destination state id
      before_id);            // move before task with before_id (optional)
    console.log(before_id, dt.getData('text/id'));
  } 

  tasks() {
    const result = [];

    if (this.props.state.title) {
      result.push(<h1 key='h'>{this.props.state.title}</h1>);
    }
    
    this.props.tasks.forEach((task) => {

      const dropped = (dt) => this.dropped(dt, task.id);

      const ddata = {'text/id': task.id, 'text/task': task.id};
      ddata['text/' + task.id] = task.id;

      result.push(
        <DropZone className="kb-divider" key={"above-" + task.id}
                  disallow={['children', task.id]} dropped={dropped} />
      );
      result.push(
        <Draggable data={ddata} key={task.id}>
          <Task task={task} board={this.props.board} api={this.props.api} />
        </Draggable>
      );
    });

    const dropped = (dt) => this.dropped(dt); 

    const disallow = ['children'];
    if (this.props.tasks.length > 0) {
      disallow.push(this.props.tasks.slice(-1)[0].id);
    }

    result.push(
      <DropZone className="kb-divider kb-tail" key='tail'
                disallow={disallow} dropped={dropped} />
    );
    
    return result;
  }

  render() {
    const className = classes(
      'kb-column',
      {
        working: this.props.state.working,
        complete: this.props.state.complete
      });

    return (
      <div className={className} style={this.props.style}>
        {this.tasks()}
      </div>
    );
  }
}

class UnorderedTaskColumn extends React.Component {

  dropped(dt) {
    this.props.api.move(
      dt.getData('text/id'), // id of task to be moved
      this.props.project.id, // id of destination project
      this.props.state.id,   // destination state id
      undefined, true);      // Move to front(/top)
  } 

  tasks() {
    return this.props.tasks.map((task) => {
      const ddata = {'text/id': task.id, 'text/task': task.id};
      ddata['text/' + task.id] = task.id;

      return (
        <Draggable data={ddata} key={task.id}>
          <Task task={task} board={this.props.board} api={this.props.api} />
        </Draggable>
      );
    });
  }

  render() {
    const className = classes(
      'kb-unordered-column',
      {
        working: this.props.state.working,
        complete: this.props.state.complete
      });

    const disallowed = this.props.tasks.map((task) => task.id);
    const dropped = (dt) => this.dropped(dt);

    return (
      <div className={classes("kb-column",
                              {complete: this.props.state.complete})}
           style={this.props.style}
           >
        <h1>{this.props.state.title}</h1>
        <DropZone className={className} disallow={disallowed} dropped={dropped}>
          {this.tasks()}
        </DropZone>
      </div>
    );
  }
}

export class Task extends Revealable {

  shouldComponentUpdate(nextProps, nextState) {
    return (nextProps.task.rev !== this.rev ||
            nextState.expanded !== this.state.expanded);
  }

  size() {
    return this.props.task.size > 1 ? '[' + this.props.task.size + ']' : '';
  }

  details() {
    if (has_text(this.props.task.description)) {
      return (
        <CardText
           dangerouslySetInnerHTML={{__html: this.props.task.description}}
          />
      );
    }
    return null;
  }

  actions() {
    return (
      <CardActions>
        <TooltipIconButton
          icon="delete_forever"
          onMouseUp={
            () => this.refs.delete.show({title: this.props.task.title})
          }
          tooltip="Delete this task." tooltipPosition="right"
          />
        <TooltipIconButton
          icon="mode_edit"
          onMouseUp={() => this.refs.edit.show()}
          tooltip="Edit this task." tooltipPosition="right"
          />
      </CardActions>
    );
  }

  avatar() {
    const {task} = this.props;
    if (task.assigned) {
      return (
        <UserAvatar
           className="kb-assigned-avatar"
           email={task.user.email}
           title={task.user.name}
           size="20"
           />
      );
    }
    return null;
  }
  
  render() {
    const {task, board, api} = this.props;
    this.rev = task.rev;

    const className = classes('kb-task', {blocked: !! task.blocked});

    const expand = () => this.setState({expanded: ! this.state.expanded});

    const blocked = (task.blocked
                     ? <div className="kb-blocked">{task.blocked}</div>
                     : null);

    return (
      <Card className={className}>
        <CardText className="kb-w-right-thing kb-revealable">
          <div className="kb-w-right-thing kb-w-right-thing-center">
            <div>
              <h1>{this.props.task.title} {this.size()}</h1>
              {blocked}
            </div>
            {this.avatar()}
          </div>
          <RevealButton expanded={this.state.expanded}
                        toggle={this.toggle_explanded.bind(this)}
                        />
        </CardText>
        <Reveal expanded={this.state.expanded}>
          {this.details()}
          {this.actions()}
          <EditTask ref="edit" task={task} board={board} api={api} />
          <Confirm ref="delete"
                   text={(<div>
                            <p>Are you sure you want to delete {task.title}?</p>
                            <p className="kb-warning">This cannot be undone.</p>
                          </div>)}
                   finish={() => api.remove(task.id)}
                   />
        </Reveal>
      </Card>
    );
  }
}
