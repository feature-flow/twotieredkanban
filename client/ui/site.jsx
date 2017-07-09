import React from 'react';

import {Tab, Tabs} from 'react-toolbox/lib/tabs';
import Dropdown from 'react-toolbox/lib/dropdown';

import {Base} from './app';
import {Dialog, DialogBase, Input, Select} from './dialog';
import {Frame} from './frame';
import SiteAPI from 'SiteAPI';
import {TooltipIconButton} from './util';
import {UserAvatar} from "./who";

import Intro from 'Intro';

class Site extends Base {

  new_api() {
    return new SiteAPI(this);
  }

  render() {
    document.title = window.location.hostname || "Valuenator demo";
    return (
      <div>
        <Frame
           title="Valunator"
           model={this.state.model}
           api={this.api}
           />
        <Intro/>
      </div>
    );
  }
}

class AdminUI extends Site {

  constructor(props) {
    super(props);
    this.state.tab_index=0;
  }

  new_api() {
    return new SiteAPI(this);
  }
  
  render() {
    const {user, users} = this.state.model;
    if (user.email && ! user.admin) {
      window.location.hash = '#/';
      return null;
    }
    document.title = window.location.hostname || "Admin";

    return (
      <div className="kb-admin-ui">
        <Frame
           title="Administrative functions"
           model={this.state.model}
           api={this.api}
           />
        <Tabs index={this.state.tab_index}
              onChange={(index) => this.setState({tab_index: index})}>
          <Tab label="Users">
            <Users users={users} api={this.api} />
          </Tab>
          <Tab label="Invitations">
            <Invites api={this.api} />
          </Tab>
        </Tabs>
      </div>
    );
  }
}

const user_types = [{label: "Normal", value: 0},
                    {label: "Adminstrator", value: 1}];

class Users extends React.Component {
  
  render() {
    const {users, api} = this.props;

    return (
      <div className="kb-users">
        <table>
          <thead><tr>
              <th></th><th>Name</th><th>Email</th><th>Type</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <UserAvatar
                     className="kb-small-avatar"
                     email={user.email}
                     title={user.name}
                     size="20"
                     />
                </td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td><Dropdown
                       source={user_types}
                       value={user.admin ? 1 : 0}
                       onChange={(v) => api.change_user_type(user.id, v == 1)}
                    /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <TooltipIconButton
          icon='add'
          onMouseUp={() => this.refs.add.show()}
          tooltip="Invite someone to the team." tooltipPosition="right"
        />
        <AddUserDialog api={this.props.api} ref="add" />
      </div>
    );
  }
}

class AddUserDialog extends DialogBase {

  finish() {
    this.props.api.add_user(
      this.state.email, this.state.name || "", this.state.type || false);
  }

  render() {
    return (
      <Dialog
         title="Invite a new team member"
         action="Invite"
         ref="dialog"
         finish={() => this.finish()}
         type="small"
        >
        <Input
           label='Email' required={true} onChange={this.required("email")}
           ref="focus"
          />
        <Input label='Name' onChange={this.val("name", "")} />
        <Select label="User type" source={user_types}
                onChange={this.val("type", 0)} />
      </Dialog>
    );
  }
}

class Invites extends React.Component {

  constructor(props) {
    super(props);
    this.state = {};
    props.api.get_invites((invites) => {
      this.setState({invites: invites});
    });
  }

  render() {
    const {invites} = this.state;
    if (invites) {
      if (invites.length > 0) {
        return (
          <div className="kb-invites">
            <table>
              <thead><tr>
                  <th></th><th>Name</th><th>Email</th><th>Type</th></tr></thead>
              <tbody>
                {invites.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <UserAvatar
                         className="kb-small-avatar"
                         email={user.email}
                         title={user.name}
                         size="20"
                         />
                    </td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td><Dropdown
                           source={user_types}
                           value={user.admin ? 1 : 0}
                           /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TooltipIconButton
              icon='add'
            onMouseUp={() => this.refs.add.show()}
            tooltip="Invite someone to the team." tooltipPosition="right"
              />
            <AddUserDialog api={this.props.api} ref="add" />
          </div>
        );
      }
      else {
        return <div>There are no outstanding invitations.</div>;
      }
    }
    else {
      return <div></div>;
    }
  }
}

module.exports = {
  Site: Site,
  AdminUI: AdminUI
};
