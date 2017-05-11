import React from 'react';

import Frame from 'Frame';
import BoardServer from '../model/board';

import Projects from './Projects';

module.exports = class extends React.Component {

  constructor(props) {
    super(props);
    this.server = new BoardServer(this, this.props.params.name);
    this.state = {model: this.server.model};
  }

  render() {
    const board = this.state.model;
    return (
      <div>
        <Frame
           boards={board.site.boards}
           add_board={(name) => this.server.add_board(name)}
           title={this.props.params.name}
           />
        <Projects board={board} server={this.server} />
      </div>);
  }
};
