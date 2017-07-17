import React from 'react';
import {IconMenu, MenuItem} from 'react-toolbox/lib/menu';

import {show_dialog} from '../ui/dialog';
import {UserAvatar, UserProfile} from "../ui/who";

const logout = () => window.location.href = "/auth/logout";

export class Avatar extends React.Component {
  render(props) {
    const {model, api} = this.props;
    const user = model.user;

    const profile = () => {
      this.refs.profile.show(
        { id: user.id, name: user.name, email: user.email, nick: user.nick }
      );
    };

    return (
      <IconMenu icon={<UserAvatar email={user.email}/>}
                position='topRight' menuRipple>
        <MenuItem icon='edit' caption='Profile'
                  onClick={show_dialog(this.refs.profile, user)} />
        <UserProfile
           ref="profile" finish={(data) => api.put('/auth/user', data)} />
          <MenuItem icon='directions_walk' caption='Logout' onClick={logout} />
      </IconMenu>
    );
  }
}
