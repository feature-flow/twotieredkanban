import React from 'react';
import classes from 'classnames';

import {AddProject} from './project';
import {Base} from './app'; 
import {BoardAPI} from 'BoardAPI';
import {Dialog, DialogBase, Input} from './dialog';
import {Draggable, DropZone} from './dnd';
import {Frame} from './frame';
import {TheBag} from './thebag';
import {TooltipButton, TooltipIconButton} from './util';
import {Project} from './project';

export class Board extends Base {

  new_api(props) {
    return new BoardAPI(this, props.params.name);
  }

  show_rename() {
    const name = this.state.model.name;
    this.refs.rename.show({old_name: name, name: name});
  }

  download() {
    this.api.export_url((url) => {
      window.open(url, '_blank');
    }); 
  }
  
  render() {
    const board = this.state.model;
    if (board.NotFound) {
      window.location.hash = '#/';
    }
    if (this.props.params.name != board.name) {
      window.location.hash = '#/board/' + encodeURIComponent(board.name);
    }
    document.title = board.name;

    const extra_nav = board.user.admin ? [
      (<TooltipIconButton
       icon="file_download" tooltip="Download board data" key="download"
       onMouseUp={() => this.download()}
       />),
      (<TooltipIconButton
       icon="mode_edit" tooltip="Rename board" key="edit"
       onMouseUp={() => this.show_rename()}
       />)
    ] : null;
    
    return (
      <div className="kb-board">
        <Frame
           title={this.props.params.name}
           model={board}
           api={this.api}
           extra_nav={extra_nav}
           calls={this.state.calls}
           />
        <Projects board={board} api={this.api} />
        <Rename ref="rename" rename={(name) => this.api.rename(name)} />
      </div>);
  }
}

class Rename extends DialogBase {
  
  render() {
    
    return (
      <Dialog title={"Rename board " + this.state.old_name}
              action="Rename" ref="dialog" type="small"
              finish={() => this.props.rename(this.state.name)}>
        <Input label='Title' required={true} onChange={this.required("name")}
               ref="focus" />
      </Dialog>
    );
  }
}


class Projects extends React.Component {

  render() {
    const {board} = this.props;
    const states = board.project_states;

    if (states.length == 0) {
      return <div></div>;
    }

    const columns = () => {
      return states.slice(1).map((state) => {
        return (
            <ProjectColumn
               key={state.id}
               state={state}
               projects={board.subtasks(state.id)}
               board={board}
               api={this.props.api}
               />
        );
      });
    };

    const size = states.slice(1).reduce(
      (n, state) => n + board.subtasks(state.id).length,
      0
    );

    return (
      <div className="kb-board">
        <div className={classes('kb-table', { "kb-empty": ! size })}>
          {columns()}
        </div>

        <div className="kb-w-right-thing">
          <div className='kb-backlog'>
            <ProjectColumn
               state={states[0]}
               projects={board.subtasks(states[0].id)}
               board={board}
               api={this.props.api}
               />
            <TooltipButton
              icon='add' floating onMouseUp={() => this.refs.add.show()}
              tooltip="Add a new feature to the backlog."
              tooltipPosition="right"
              />
              <AddProject ref="add" api={this.props.api} />
          </div>
          <TheBag board={board} api={this.props.api}
                  search_results={board.search.archive} />
        </div>
      </div>
    ); 
  }
}


class ProjectColumn extends React.Component {

  dropped(dt, before_id) {
    const {api, board, state} = this.props;
    const feature_id = dt.getData('text/id');
    api.move(
      feature_id,
      undefined,             // id of destination project
      this.props.state.id,   // destination state id
      before_id);            // move before project with before_id (optional)

    if (state.explode) {
      const feature = board.tasks[feature_id];
      if (feature.subtasks().length == 0) {
        api.add_task({
          project_id: feature_id,
          title: ' ',
          description: '',
          size: 1});
      }
    }
  } 

  projects() {
    const result = [];
    const {board, api} = this.props;

    this.props.projects.forEach((project) => {
      const dropped = (dt) => this.dropped(dt, project.id);
      const ddata = {'text/id': project.id};
      ddata['text/' + project.id] = project.id;
      if (project.count > 0) {
        ddata['text/children'] = project.count;
      }

      result.push(
        <DropZone className="kb-divider" dropped={dropped}
                  disallow={[project.id]} key={"above-" + project.id} />
      );
      result.push(
        <Draggable data={ddata} key={project.id}>
          <Project project={project} board={board} api={api} />
        </Draggable>
      );
    });

    const {projects} = this.props;
    const disallow = projects.length > 0 ? [projects.slice(-1)[0].id] : [];
    result.push(
        <DropZone className="kb-divider kb-tail" key='tail'
                  dropped={(dt) => this.dropped(dt)}
                  disallow={disallow}
                  />
    );

    return result;
  }

  render() {
    return (
      <div className="kb-column">
        <h1>{this.props.state.title}</h1>
        {this.projects()}
      </div>
    );
  }
}
