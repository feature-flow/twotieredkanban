import React from 'react';
import {IconMenu, MenuItem} from 'react-toolbox';

import {UserAvatar, UserSelect} from '../ui/who';
import {Dialog, DialogBase} from '../ui/dialog';

class UserSwitch extends DialogBase {
  
  render() {
    return (
      <Dialog
         title="Select a user to switch to" action="Switch" ref="dialog"
         finish={() => this.props.api.switch_user(this.state.user)}
         type="small"
        >
        <UserSelect label="Be logged in as" onChange={this.val("user")}
                    users={this.props.api.model.site.users} />
      </Dialog>
    );
  }
}


module.exports = {
  Avatar: class extends React.Component {
    render () {
      const switch_user =
              () => this.refs.switch.show({user: this.props.user.id});
      return (
        <IconMenu icon={<UserAvatar email={this.props.user.email}/>}
                  position='topRight' menuRipple>
          <MenuItem value='profile' icon='edit' caption='Profile' />
          <MenuItem icon='directions_walk' caption='Switch user'
                    onClick={switch_user} />
          <UserSwitch ref="switch" api={this.props.api} />
        </IconMenu>
      );
    }
  }
};
