import React from 'react';
import {IconButton} from 'react-toolbox';

module.exports = {
  RevealButton: (props) => {
    return (
      <IconButton
         icon={props.expanded ? "arrow_drop_up" : "arrow_drop_down"}
         onMouseUp={props.toggle} className="kb-reveal-button"
         />);
  },
  Revealable: class extends React.Component {

    constructor (props) {
      super(props);
      this.state = {};
    }

    toggle_explanded() {
      this.setState({expanded: ! this.state.expanded});
    }
  },
  Reveal: class extends React.Component {
    render() {
      if (this.props.expanded) {
        return <div>{this.props.children}</div>;
      }
      return null;
    }
  }
};
