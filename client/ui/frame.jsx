import React from 'react';
import {AppBar, Dialog, Drawer, Input,
        List, ListItem, ListSubHeader, Navigation
       } from 'react-toolbox';

import {UserAvatar} from "./who";
import {Boards} from "./boards";

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
           rightIcon={<UserAvatar email={this.props.user.email} />}
          >
          <Navigation type='horizontal'>
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
