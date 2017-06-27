import React from 'react';

import {List, ListItem, ListSubHeader} from 'react-toolbox/lib/list';
import {Dialog, Input, DialogBase} from './dialog';

module.exports = {
  Boards: (props) => {
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
    
  },
  AddBoardDialog: class extends DialogBase {
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

};
