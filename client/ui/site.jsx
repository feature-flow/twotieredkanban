import React from 'react';
import {Button} from 'react-toolbox';

import {Boards, AddBoardDialog} from './boards';
import Frame from './frame';
import SiteAPI from 'SiteAPI';

module.exports = class extends React.Component {

  constructor(props) {
    super(props);
    this.api = new SiteAPI(this);
    this.state = {model: this.api.model};
  }

  render() {
    const boards = this.state.model.boards;
    return (
      <div>
        <Frame
           title="Boards"
           user={this.state.model.user}
           boards={boards}
           api={this.api}
           />
        <Boards boards={boards} />
        <Button icon='add' floating onMouseUp={() => this.refs.add.show()} />
          <AddBoardDialog api={this.api} ref="add" />
      </div>
    );
  }

};
