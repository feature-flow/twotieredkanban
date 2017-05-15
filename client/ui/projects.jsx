import React from 'react';
import {Button} from 'react-toolbox';

import {ProjectDialog} from './project';
import ProjectColumn from './projectcolumn';

module.exports = class extends React.Component {

  render() {

    const board = this.props.board;
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
              api={this.props.api}
              />
          </td>
        );
      });
    };

    const add_project = (data) => {
      this.props.api.add_project(data.title, data.description || '');
    };

    return (
      <div className="kb-board">
        <table>
          <thead><tr>{headers()}</tr></thead>
          <tbody><tr>{columns()}</tr></tbody>
        </table>

        <div>
          <h4>{states[0].title}</h4>
          <ProjectColumn
             state={states[0]}
             projects={board.subtasks(states[0].id)}
             api={this.props.api}
             />
          <Button icon='add' floating
                  onMouseUp={() => this.refs.add.show()}
                  />
          <ProjectDialog action="Add" ref="add" finish={add_project} />
        </div>
      </div>
    ); 
  }
}
