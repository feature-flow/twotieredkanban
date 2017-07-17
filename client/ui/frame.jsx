import React from 'react';

import AppBar from 'react-toolbox/lib/app_bar';
import {Button} from 'react-toolbox/lib/button';
import Drawer from 'react-toolbox/lib/drawer';
import {List, ListItem, ListSubHeader} from 'react-toolbox/lib/list';
import Navigation from 'react-toolbox/lib/navigation';
import {MenuItem} from 'react-toolbox/lib/menu';
import ProgressBar from 'react-toolbox/lib/progress_bar';

import version from '../version';

import {Admin} from './admin';
import {Avatar} from 'AuthUI';
import {Dialog, Input, DialogBase} from './dialog';
import {TooltipButton, TooltipIconButton, TooltipIconMenu} from './util';

const send_us_email = () => {
  window.open("mailto:feedback@valuenator.com", "_blank");
};

const report_bug = () => {
  window.open("https://github.com/feature-flow/twotieredkanban/issues/new",
              "_blank");
};

const get_help = () => {
  window.open(
    "http://feature-flow.readthedocs.io/en/latest/" +
    "valuenator.html#using-valuenator",
    "_blank");
};

export class Frame extends React.Component {

  constructor(props) {
    super(props);
    this.state = { show_drawer: false };
  }

  go_home() {
    window.location.hash = '#/';
  }

  render() {
    const {api, calls, extra_nav, model, title} = this.props;
    
    const toggle_drawer = () => {
      this.setState({show_drawer: ! this.state.show_drawer});
    };

    const progress = calls ? (
      <ProgressBar className="kb-progress" mode="indeterminate"
                   />
    ) : null;
    
    return (
      <div className='kb-frame'>
        {progress}
        <AppBar title={title} leftIcon='menu' onLeftIconClick={toggle_drawer}>
          <Navigation type='horizontal' className="kb-frame-nav">
            <TooltipIconButton
               icon='help'
               onMouseUp={get_help}
               tooltip="View Valuenator documentation."
               />
            <TooltipIconMenu icon="feedback"
                             tooltip="Let is know what you think!">
              <MenuItem
                 icon="mail"
                 caption='Send us an email'
                 onClick={send_us_email}
                 />
              <MenuItem
                 icon="bug_report"
                 caption='Report a bug or make a suggestion'
                 onClick={report_bug}
                 />
            </TooltipIconMenu>
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
