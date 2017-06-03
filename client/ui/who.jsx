import React from 'react';
import {Avatar, Dropdown, Tooltip} from 'react-toolbox';
import md5 from 'md5';

const TAvatar = Tooltip(Avatar);

const UserAvatar = (props) => {
  const {email, size, title} = props;
  const src = 'https://www.gravatar.com/avatar/' +
          md5(email) + '.jpg?s=' + (size || 32) + '&d=wavatar';
  if (title) {
    return <TAvatar tooltip={title} image={src} />;
  }
  else {
    return <Avatar image={src} />;
  }
};

const User = (props) => (
  <div className="kb-user">
    <UserAvatar email={props.user.email} />
    <div>
      <div><strong>{props.user.name}</strong></div>
      <div><small>{props.user.nick} {props.user.email}</small></div>
    </div>
  </div>
);

const user_select_template = (user) => <User user={user} />;

module.exports = {
  UserAvatar: UserAvatar,
  User: User,
  UserSelect: (props) => {
    const users = props.users.map(
      (u) => Object.assign({value: u.id}, u));
    
    return (<Dropdown className="kb-assigned"
            auto={false}
            source={users}
            onChange={props.onChange}
            label={props.label}
            value={props.onChange()}
            template={user_select_template}
            />);
  }
};