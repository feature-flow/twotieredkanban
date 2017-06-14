import React from 'react';
import {AppBar, Button, Drawer, Link, Navigation, IconMenu, MenuItem
       } from 'react-toolbox';

import {Boards, AddBoardDialog} from './boards';
import {Avatar} from 'AuthUI';
import {Admin} from './admin';

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
          <Admin user={model.user} >
            <Button icon='add'
                    floating onMouseUp={() => this.refs.add.show()} />
                    <AddBoardDialog api={this.props.api} ref="add" />

          </Admin>
          <Link icon="home" href="#/" />
          
        </Drawer>
      </div>
      );
  }
}; 

module.exports = Frame;
