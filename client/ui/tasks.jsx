import React from 'react';
import {Card, CardText, Dropdown} from 'react-toolbox';
import classes from 'classnames';
import RichTextEditor from 'react-rte';

import {Dialog, DialogBase, Editor, Input} from './dialog';
import {Draggable, DropZone} from './dnd';
import {UserAvatar, UserSelect} from './who';

class TaskDialog extends DialogBase {
  
  render() {
    const action = this.action();
    
    return (
      <Dialog
         title={action + " task"} action={action} ref="dialog"
         finish={() => this.finish(this.state)} type="large"
        >
        <Input label='Title' required={true} onChange={this.required("title")}
               />
        <Input label='Size' type="number" required={true}
               onChange={this.val("size", 1)} />
        <UserSelect label="Assigned" onChange={this.val("assigned")}
                    users={this.props.board.users} />
        <Input
           label='Blocked' multiline={true} onChange={this.val("blocked")} />
        <Editor onChange={this.val("description")} />
      </Dialog>
    );
  }
}

class AddTask extends TaskDialog {

  action() { return "Add"; }

  show() {
    super.show({
      title: '',
      description: RichTextEditor.createEmptyValue(),
      size: 1,
      blocked: ''
    });
  }

  finish(data) {
    this.props.api.add_task(
      this.props.project.id, data.title, data.description.toString('html'),
      parseInt(data.size), data.blocked, data.assigned);
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

  finish(data) {
    this.props.api.update_task(
      data.id, data.title, data.description.toString('html'),
      parseInt(data.size), data.blocked, data.assigned);
  }
}


class TaskBoard extends React.Component {

  render() {

    const {project} = this.props;

    const headers = () => {
      return project.state.substates.map((state) => {
        return <th key={state.id}>{state.title}</th>;
      });
    };

    const columns = () => {
      return project.state.substates.map((state) => {
        return (
          <td key={state.id}>
            <TaskColumn
               project={project}
               state={state}
               tasks={project.subtasks(state.id)}
               board={this.props.board}
               api={this.props.api}
               />
          </td>
        );
      });
    };

    return (
      <div className="kb-task-board">
        <table>
          <thead><tr>{headers()}</tr></thead>
          <tbody><tr>{columns()}</tr></tbody>
        </table>
      </div>
    ); 
  }
}

class TaskColumn extends React.Component {

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
    
    this.props.tasks.forEach((task) => {

      const dropped = (dt) => this.dropped(dt, task.id);

      const ddata = {'text/id': task.id};
      ddata['text/' + task.id] = task.id;

      result.push(
        <DropZone className="kb-divider" key={"above-" + task.id}
                  disallow={[task.id]} dropped={dropped} />
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
      <div className={className}>
        {this.tasks()}
      </div>
    );
  }
}

class Task extends React.Component {

  shouldComponentUpdate(nextProps, nextState) {
    return (nextProps.task.rev !== this.rev);
  }

  size() {
    return this.props.task.size > 1 ? '[' + this.props.task.size + ']' : '';
  }
  
  render() {
    const {task, board, api} = this.props;
    this.rev = task.rev;

    const className = classes('kb-task', {blocked: !! task.blocked});

    const avatar = () =>
            task.assigned ?
            <UserAvatar
              email={task.user.email}
              title={task.user.name}
              size="20"
              />
      : null;

    return (
      <Card className={className} onClick={() => this.refs.edit.show()}>
        <CardText>
          {this.props.task.title} {this.size()} {avatar()}
        </CardText>
        <EditTask ref="edit" task={task} board={board} api={api} />
      </Card>
    );
  }
}

module.exports = {
  AddTask: AddTask,
  Task: Task,
  TaskBoard: TaskBoard,
  TaskColumn: TaskColumn
};
