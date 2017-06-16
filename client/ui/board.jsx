import React from 'react';

import {Base} from './app'; 
import BoardAPI from 'BoardAPI';
import Frame from './frame';
import Projects from './projects';

module.exports = {
  Board: class extends Base {

    new_api(props) {
      return new BoardAPI(this, props.params.name);
    }
    
    render() {
      const board = this.state.model;
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
};
