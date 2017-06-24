import React from 'react';
import {AppBar, Button, Drawer, Link, Navigation, IconMenu, MenuItem
       } from 'react-toolbox';

import version from '../version';

import {Boards, AddBoardDialog} from './boards';
import {Avatar} from 'AuthUI';
import {Admin} from './admin';
import {TooltipButton, TooltipIconButton} from './util';

class Frame extends React.Component {

  constructor(props) {
    super(props);
    this.state = { show_drawer: false };
  }

  go_home() {
    window.location.hash = '#/';
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

          <div className="kb-button-row">
            <Admin user={model.user} >
              <TooltipIconButton
                 icon='add' floating
                 onMouseUp={() => this.refs.add.show()}
                tooltip="Add another board." tooltipPosition="right"
                />
                <AddBoardDialog api={this.props.api} ref="add" />
            </Admin>
            <TooltipIconButton
               icon="home" onMouseUp={this.go_home} tooltipPosition="right"
               tooltip="View welcome message."
               />
          </div>
          <div className="kb-version">{version}</div>
        </Drawer>
      </div>
      );
  }
}; 

module.exports = Frame;
