import React from 'react';

import AppBar from 'react-toolbox/lib/app_bar';
import {Button} from 'react-toolbox/lib/button';
import Drawer from 'react-toolbox/lib/drawer';
import {List, ListItem, ListSubHeader} from 'react-toolbox/lib/list';
import Navigation from 'react-toolbox/lib/navigation';
import {IconMenu, MenuItem} from 'react-toolbox/lib/menu';

import version from '../version';

import {Admin} from './admin';
import {Avatar} from 'AuthUI';
import {Dialog, Input, DialogBase} from './dialog';
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

const Boards = (props) => {
  const goto_board = (board) => {
    window.location.hash = '#/board/' + encodeURIComponent(board.name);
  };

  const boards = () => {
    const boards = props.boards; 
    if (boards.length > 0) {
      return boards.map((board) => {
        return (
          <ListItem
             caption={board.name}
             onClick={() => goto_board(board)}
            key={board.name}
            />
        );
      });
    }
    else {
      return <ListSubHeader caption="No boards have been created" />;
    }
  };

  return (
    <List selectable ripple>
      <ListSubHeader caption='Boards' />
      {boards()}
    </List>
  );
  
};

class  AddBoardDialog extends DialogBase {
  render() {
    return (
      <Dialog
         title="New Board" action="Add" ref="dialog"
         finish={() => this.props.api.add_board(this.state.name)}
        >
        <Input label='Name' required={true}
               onChange={this.required("name")} ref="focus" />
      </Dialog>
    );
  }
}

module.exports = {
  Frame: Frame
};
