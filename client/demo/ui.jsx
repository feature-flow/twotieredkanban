import React from 'react';
import {IconMenu, MenuItem} from 'react-toolbox/lib/menu';

import {UserAvatar, UserSelect, UserProfile} from '../ui/who';
import {Dialog, DialogBase, show_dialog} from '../ui/dialog';

class UserSwitch extends DialogBase {

  render() {
    const {model, api} = this.props;
    return (
      <Dialog
         title="Select a user to switch to" action="Switch" ref="dialog"
         finish={() => api.switch_user(this.state.user)}
         type="small"
        >
        <UserSelect label="Be logged in as" onChange={this.val("user")}
                    users={model.users} />
      </Dialog>
    );
  }
}

module.exports = {
  Avatar: class extends React.Component {
    render () {
      const {model, api} = this.props;
      const user = model.user;
      return (
        <IconMenu icon={<UserAvatar email={user.email}/>}
                  position='topRight' menuRipple>
          <MenuItem icon='edit' caption='Profile'
                    onClick={show_dialog(this.refs.profile, user)} />
          <UserProfile
             ref="profile" finish={(data) => api.update_profile(data)} />
          <MenuItem icon='directions_walk' caption='Switch user'
                    onClick={show_dialog(this.refs.switch, {user: user.id})} />
          <UserSwitch ref="switch" model={model} api={api} />
        </IconMenu>
      );
    }
  }
};
