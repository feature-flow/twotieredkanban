import React from 'react';

import BoardAPI from 'BoardAPI';
import Frame from './frame';

import Projects from './projects';

module.exports = {
  Board: class extends React.Component {

    constructor(props) {
      super(props);
      this.api = new BoardAPI(this, this.props.params.name);
      this.api.start();
      this.state = {model: this.api.model};
    }

    componentWillUnmount() {
      this.api.stop();
    }

    componentWillMount() {
      this.api.start();
    }

    componentWillReceiveProps(nextProps) {
      if (nextProps.params.name !== this.props.params.name) {
        this.api.stop();
        this.api = new BoardAPI(this, nextProps.params.name);
        this.api.start();
        this.setState({model: this.api.model});
      }
    }
    
    render() {
      const board = this.state.model;
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
