import React from 'react';
import {AppBar, Drawer, Navigation, IconMenu, MenuItem} from 'react-toolbox';

import {Boards} from './boards';
import {Avatar} from 'AuthUI';

class Frame extends React.Component {

  constructor(props) {
    super(props);
    this.state = { show_drawer: false };
  }

  render() {
    const {title, model, api} = this.props;
    
    const toggle_drawer = () => {
      this.setState({show_drawer: ! this.state.show_drawer});
    };
    
    return (
      <div>
        <AppBar title={title} leftIcon='menu' onLeftIconClick={toggle_drawer}>
          <Navigation type='horizontal'>
            <Avatar model={model} api={this.props.api} />
          </Navigation>
        </AppBar>
        <Drawer active={this.state.show_drawer}
                onOverlayClick={toggle_drawer}
                >
          <Boards boards={model.boards} />
        </Drawer>
      </div>
      );
  }
}; 

module.exports = Frame;
