import React from 'react';
import {Button, Card, CardText, CardActions, IconButton} from 'react-toolbox';

import {Dialog, DialogBase, Input} from './Dialog';

class ProjectDialog extends DialogBase {
  
  render() {
    const action = this.props.action;

    const finish = () => {
      console.log(this.state);
      this.props.finish(this.state);
    };
    
    return (
      <Dialog title={action + " project"} action={action} ref="dialog"
              finish={finish}>
        <Input label='Title' required={true} onChange={this.val("title")} />
        <Input label='Description' multiline={true}
               onChange={this.val("description")} />
      </Dialog>
    );
  }
}

class Project extends React.Component {

  render () {
    return (
      <Card>
        <CardText>
          <IconButton icon="arrow_drop_down" />
          {this.props.project.title}
        </CardText>
        <CardActions>
          <IconButton icon="mode_edit" onMouseUp={this.props.edit}/>
        </CardActions>
      </Card>);
  }

}

module.exports = {
  Project: Project,
  ProjectDialog: ProjectDialog
};
