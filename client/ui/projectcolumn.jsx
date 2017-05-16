import React from 'react';

import {Draggable, DropZone} from './dnd';
import {Project} from './project';

module.exports = class extends React.Component {

  dropped(dt, before_id) {
    this.props.api.move(
      dt.getData('text/id'), // id of project to be moved
      undefined,             // id of destination project
      this.props.state.id,   // destination state id
      before_id);            // move before project with before_id (optional)
    console.log(before_id, dt.getData('text/id'));
  } 

  projects() {
    return this.props.projects.map((project) => {

      const dropped = (dt) => this.dropped(dt, project.id); 

      return (
        <div key={project.id}>
          <DropZone className="kb-divider" dropped={dropped} />
          <Draggable data={{'text/id': project.id}}>
            <Project project={project} api={this.props.api} />
          </Draggable>
          
        </div>
      );
    });
  }

  render() {
    const dropped = (dt) => this.dropped(dt); 

    return (
      <div className="kb-column">
        {this.projects()}
        <DropZone className="kb-divider kb-tail" dropped={dropped} />
      </div>
    );
  }
};
