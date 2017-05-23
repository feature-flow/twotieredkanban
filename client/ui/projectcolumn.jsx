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
    const result = [];

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
            <Project project={project} api={this.props.api} />
          </Draggable>
      );
    });

    const {projects} = this.props;
    const disallow = projects.length > 0 ? [projects.slice(-1)[0].id] : [];
    result.push(
        <DropZone className="kb-divider kb-tail"
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
};
