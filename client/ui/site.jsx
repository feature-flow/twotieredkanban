import React from 'react';
import {Button} from 'react-toolbox';

import {Boards, AddBoardDialog} from './boards';
import Frame from './frame';
import SiteAPI from 'SiteAPI';

import demo_html from './demo.html';

const demo_body = (new DOMParser())
        .parseFromString(demo_html, 'text/html')
        .getElementsByClassName("body");

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
    let x = demo_html;
    const boards = this.state.model.boards;
    return (
      <div>
        <Frame
           title="Boards"
           model={this.state.model}
           api={this.api}
           />
        <div dangerouslySetInnerHTML={{__html: demo_body}}></div>
      </div>
    );
  }
};
