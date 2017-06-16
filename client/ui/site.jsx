import React from 'react';

import {Base} from './app'; 
import Frame from './frame';
import SiteAPI from 'SiteAPI';
import Intro from 'Intro';

module.exports = class extends Base {

  new_api() {
    return new SiteAPI(this);
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
