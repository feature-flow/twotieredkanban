import React from 'react';
import {IconMenu, MenuItem} from 'react-toolbox';

import {UserAvatar} from "../ui/who";

module.exports = {
  Avatar: (props) => {
    return (
      <IconMenu icon={<UserAvatar email={props.user.email}/>}
                position='topRight' menuRipple>
        <MenuItem value='profile' icon='edit' caption='Profile' />
        <MenuItem
           value='logout' icon='directions_walk' caption='Logout' />
      </IconMenu>
    );
  }
};
