import React from 'react';

import {Project, ProjectDialog} from './project';

module.exports = class extends React.Component {


  projects() {
    return this.props.projects.map((project) => {
      
      const edit = () => this.refs.edit.show({
        id: project.id, title: project.title, description: project.description
      });

      return <Project project={project} key={project.id} edit={edit} />;
    });
  }

  render() {
    const edit_project = (data) => {
      this.props.api.update_project(data.id, data.title, data.description);
    };

    return (
      <div>
        {this.projects()}
        <ProjectDialog action="Edit" ref="edit" finish={edit_project} />
      </div>
    );
  }
};
