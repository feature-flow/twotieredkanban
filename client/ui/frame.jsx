import React from 'react';
import {AppBar, Dialog, Drawer, Input, Link,
        List, ListItem, ListSubHeader, Navigation
       } from 'react-toolbox';
import {Gravitar} from "./who";

class AddDialog extends React.Component {

  render() {

    const ok = () => this.props.add(this.name || '');

    const cancel = () => this.props.add('');

    const actions = [{label: "Cancel", onClick: cancel},
                     {label: "Ok", onClick: ok}
                    ];

    return (
      <Dialog
         actions={actions}
         active={this.props.active}
         onEscDown={cancel}
         onOverlayClick={cancel}
         title="Add board"
         type="small"
         >
        <Input label="Board name" onChange={(v) => {this.name = v;}} />
      </Dialog>
    );
  }
}

class Frame extends React.Component {

  constructor(props) {
    super(props);
    // Props:
    // boards: list of board objects
    // add_board: cp to add a board
    this.state = {
      show_drawer: false,
      adding: false
    };
  }

  render() {
    const toggle_drawer = () => {
      this.setState({show_drawer: ! this.state.show_drawer});
    };

    const boards = () => {
      const boards = this.props.boards; 
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

    const goto_board = (board) => {
      window.location.hash = '#/board/' + encodeURIComponent(board.name);
      this.setState({show_drawer: false});
    };

    const show_add = () => {
      this.setState({adding: true});
    };

    const add_board = (name) => {
      this.setState({adding: false});
      if (name.length > 0) {
        this.props.add_board(name);
      }
    };

    
    return (
      <div>
        <AppBar
           title={this.props.title}
           leftIcon='menu'
           onLeftIconClick={toggle_drawer}
           rightIcon={<Gravitar email={this.props.user.email} />}
          >
          <Navigation type='horizontal'>
          </Navigation>
        </AppBar>
        <Drawer active={this.state.show_drawer}
                onOverlayClick={toggle_drawer}
                >
          <List selectable ripple>
            <ListSubHeader caption='Boards' />
            {boards()}
            <ListItem caption="New board" leftIcon="add"
                      onClick={show_add} />
          </List>
          <AddDialog active={this.state.adding} add={add_board} />
        </Drawer>
      </div>
      );
  }
}; 

module.exports = Frame;
