import React from 'react';
import {Button} from 'react-toolbox';

import {AddProject} from './project';
import ProjectColumn from './projectcolumn';
import {TheBag} from './thebag';

module.exports = class extends React.Component {

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
            <Button
               icon='add' floating onMouseUp={() => this.refs.add.show()} />
              <AddProject ref="add" api={this.props.api} />
          </div>
          <TheBag board={board} api={this.props.api}
                  search_results={board.search.archive} />
        </div>
      </div>
    ); 
  }
};
