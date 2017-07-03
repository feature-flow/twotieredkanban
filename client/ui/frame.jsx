import React from 'react';

import AppBar from 'react-toolbox/lib/app_bar';
import {Button} from 'react-toolbox/lib/button';
import Drawer from 'react-toolbox/lib/drawer';
import Link from 'react-toolbox/lib/link';
import Navigation from 'react-toolbox/lib/navigation';
import {IconMenu, MenuItem} from 'react-toolbox/lib/menu';

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
    const {title, model, api, extra_nav} = this.props;
    
    const toggle_drawer = () => {
      this.setState({show_drawer: ! this.state.show_drawer});
    };
    
    return (
      <div className='kb-frame'>
        <AppBar title={title} leftIcon='menu' onLeftIconClick={toggle_drawer}>
          <Navigation type='horizontal' className="kb-frame-nav">
            {extra_nav}
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
                 icon='build'
                 onMouseUp={() => window.location.hash = '#/admin'}
                 tooltip="Administrative functions" tooltipPosition="right"
                />
              <TooltipIconButton
                icon='add'
                onMouseUp={() => this.refs.add.show()}
                tooltip="Add another board." tooltipPosition="right"
                />
                <AddBoardDialog api={this.props.api} ref="add" />
            </Admin>
            <TooltipIconButton
               icon="home" onMouseUp={() => window.location.hash = '#/'}
               tooltip="View the welcome message." tooltipPosition="right"
               />
          </div>
          <div className="kb-version">{version}</div>
        </Drawer>
      </div>
      );
  }
}; 

module.exports = Frame;
