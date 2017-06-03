import React from 'react';
import {IconMenu, MenuItem} from 'react-toolbox';

import {UserAvatar, UserSelect} from '../ui/who';
import {Dialog, DialogBase, Input} from '../ui/dialog';

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

class Profile extends DialogBase {
  
  render() {
    return (
      <Dialog
         title="Update your information" action="Update" ref="dialog"
         finish={() => this.props.api.update_profile(this.state)}
         type="small"
        >
        <Input label='Name' required={true} onChange={this.val("name")} />
        <Input label='Email' required={true} onChange={this.val("email")} />
        <Input label='Nickname' required={true} onChange={this.val("nick")} />
      </Dialog>
    );
  }
}

module.exports = {
  Avatar: class extends React.Component {
    render () {
      const {model, api} = this.props;
      const user = model.user;
      const profile = () => {
        this.refs.profile.show(
          { id: user.id, name: user.name, email: user.email, nick: user.nick }
        );
      };
      const switch_user = () => this.refs.switch.show({user: user.id});
      return (
        <IconMenu icon={<UserAvatar email={user.email}/>}
                  position='topRight' menuRipple>
          <MenuItem icon='edit' caption='Profile' onClick={profile} />
          <Profile ref="profile" api={this.props.api} />
          <MenuItem icon='directions_walk' caption='Switch user'
                    onClick={switch_user} />
          <UserSwitch ref="switch" model={model} api={api} />
        </IconMenu>
      );
    }
  }
};
