import React from 'react';
import {Button} from 'react-toolbox';

import {Boards, AddBoardDialog} from './boards';
import Frame from './frame';
import SiteAPI from 'SiteAPI';
import Intro from 'Intro';

module.exports = class extends React.Component {

  constructor(props) {
    super(props);
    this.api = new SiteAPI(this);
    this.api.start();
    this.state = {model: this.api.model};
  }
  
  componentWillUnmount() {
    this.api.stop();
  }

  componentWillMount() {
    this.api.start();
  }

  render() {
    document.title = window.location.hostname || "Valuenator demo";
    const boards = this.state.model.boards;
    return (
      <div>
        <Frame
           title="Valunator"
           model={this.state.model}
           api={this.api}
           />
        <Intro/>
      </div>
    );
  }
};
