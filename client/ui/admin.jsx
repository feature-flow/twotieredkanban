import React from 'react';

class Admin extends React.Component {

  render() {
    if (this.props.user.admin) {
      return <div className="kb-admin">{this.props.children}</div>;
    }
    else {
      return null;
    }
  }  
}

module.exports = {Admin: Admin};
