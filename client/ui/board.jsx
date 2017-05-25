import React from 'react';

import BoardAPI from 'BoardAPI';
import Frame from './frame';
import Projects from './projects';

module.exports = class extends React.Component {

  constructor(props) {
    super(props);
    this.api = new BoardAPI(this, this.props.params.name);
    this.state = {model: this.api.model};
  }

  render() {
    const board = this.state.model;
    return (
      <div>
        <Frame
           boards={board.site.boards}
           add_board={(name) => this.api.add_board(name)}
           title={this.props.params.name}
           />
        <Projects board={board} api={this.api} />
      </div>);
  }
};
