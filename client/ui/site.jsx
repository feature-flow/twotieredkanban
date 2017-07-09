import React from 'react';

import {Tab, Tabs} from 'react-toolbox/lib/tabs';
import Dropdown from 'react-toolbox/lib/dropdown';

import {Base} from './app';
import {Dialog, DialogBase, Input, Select} from './dialog';
import {Frame} from './frame';
import {Reveal} from './revealbutton';
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
          <Tab label="Access requests">
            <Requests api={this.api} />
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
      </div>
    );
  }
}

class Requests extends React.Component {

  constructor(props) {
    super(props);
    this.state = {};
    this.get_requests();
  }

  get_requests() {
    this.props.api.get_requests((requests) => {
      this.setState({requests: requests});
    });
  }
  
  approve(email) {
    this.props.api.approve(email, () => this.get_requests());
  }

  render() {
    const {requests} = this.state;
    if (requests) {
      if (requests.length > 0) {
        return (
          <div className="kb-requests">
            <table>
              <thead><tr>
                  <th></th><th>Name</th><th>Email</th><th></th></tr></thead>
              <tbody>
                {requests.map((user) => (
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
                    <td><Reveal expanded={! user.approved}><TooltipIconButton
                        icon="done"
                        onMouseUp={() => this.approve(user.email)}
                        tooltip="Approve this user's request to join the team."
                        /></Reveal></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      else {
        return <div>There are no outstanding access requests.</div>;
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
