import React from 'react';

import Frame from './frame';
import SiteAPI from 'SiteAPI';

module.exports = class extends React.Component {

  constructor(props) {
    super(props);
    this.api = new SiteAPI(this);
    this.state = {model: this.api.model};
  }

  render() {
    return (
      <div>
        <Frame
          boards={this.state.model.boards}
          add_board={(name) => this.api.add_board(name)}
          title="Boards"
          user={this.state.model.user}
          />
          <h2>Site</h2>
      </div>
    );
  }

};
