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
    const toggle_drawer = () => {
      this.setState({show_drawer: ! this.state.show_drawer});
    };
    
    return (
      <div>
        <AppBar
           title={this.props.title}
           leftIcon='menu'
           onLeftIconClick={toggle_drawer}
          >
          <Navigation type='horizontal'>
            <Avatar user={this.props.user} api={this.props.api} />
          </Navigation>
        </AppBar>
        <Drawer active={this.state.show_drawer}
                onOverlayClick={toggle_drawer}
                >
          <Boards boards={this.props.boards} />
        </Drawer>
      </div>
      );
  }
}; 

module.exports = Frame;
