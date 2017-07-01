import React from 'react';
import Avatar from 'react-toolbox/lib/avatar';
import Dropdown from 'react-toolbox/lib/dropdown';
import Tooltip from 'react-toolbox/lib/tooltip';
import md5 from 'md5';

import {Dialog, DialogBase, Input} from './dialog';

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

const user_select_template = (user) => {
  if (user.value) {
    return <User user={user} />;
  }
  else {
    return <div>{user.title}</div>;
  }
};

const UserSelect = (props) => {
  const users = props.users.map(
    (u) => Object.assign({value: u.id}, u));

  if (props.none) {
    users.unshift({value: '', title: props.none});
  }

  return (<Dropdown className="kb-assigned"
          auto={false}
          source={users}
          onChange={props.onChange}
          label={props.label}
          value={props.onChange()}
          template={user_select_template}
          />);
};

class Profile extends DialogBase {
  
  render() {

    const finish = () => {
      this.props.finish(
        {
          id: this.state.id,
          name: this.state.name,
          email: this.state.email,
          nick: this.state.nick
        });
    };

    return (
      <Dialog
         title="Update your information" type="small" action="Update"
         finish={finish} ref="dialog">
        <Input label='Name' required={true} onChange={this.required("name")}
               ref="focus" />
        <Input label='Email' required={true} onChange={this.required("email")}
               />
        <Input label='Nickname' required={true} onChange={this.required("nick")}
               />
      </Dialog>
    );
  }
}


module.exports = {
  UserAvatar: UserAvatar,
  User: User,
  UserSelect: UserSelect,
  UserProfile: Profile
};
