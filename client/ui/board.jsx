import React from 'react';

import {AddProject} from './project';
import {Base} from './app'; 
import BoardAPI from 'BoardAPI';
import {Draggable, DropZone} from './dnd';
import Frame from './frame';
import {TheBag} from './thebag';
import {TooltipButton} from './util';
import {Project} from './project';

class Board extends Base {

    new_api(props) {
      return new BoardAPI(this, props.params.name);
    }
    
    render() {
      const board = this.state.model;
      if (board.NotFound) {
        window.location.hash = '#/';
      }
      document.title = board.name;
      return (
        <div>
          <Frame
             title={this.props.params.name}
             model={board}
             api={this.api}
             />
          <Projects board={board} api={this.api} />
        </div>);
    }
}


class Projects extends React.Component {

  render() {
    const {board} = this.props;
    const states = board.project_states;

    if (states.length == 0) {
      return <div></div>;
    }

    const headers = () => {
      return states.slice(1).map((state) => {
        return <th key={state.id}>{state.title}</th>;
      });
    };

    const columns = () => {
      return states.slice(1).map((state) => {
        return (
          <td key={state.id}>
            <ProjectColumn
               state={state}
               projects={board.subtasks(state.id)}
               board={board}
               api={this.props.api}
               />
          </td>
        );
      });
    };

    return (
      <div className="kb-board">
        <table>
          <thead><tr>{headers()}</tr></thead>
          <tbody><tr>{columns()}</tr></tbody>
        </table>

        <div className="kb-w-right-thing">
          <div className='kb-backlog'>
            <h4>{states[0].title}</h4>
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
    this.props.api.move(
      dt.getData('text/id'), // id of project to be moved
      undefined,             // id of destination project
      this.props.state.id,   // destination state id
      before_id);            // move before project with before_id (optional)
    console.log(before_id, dt.getData('text/id'));
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
        {this.projects()}
      </div>
    );
  }
}


module.exports = {
  Board: Board
};
