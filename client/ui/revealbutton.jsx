import React from 'react';
import {IconButton} from 'react-toolbox';

module.exports = {
  RevealButton: (props) => {
    return (
      <IconButton
         icon={props.expanded ? "arrow_drop_up" : "arrow_drop_down"}
         onMouseUp={props.toggle} className="kb-reveal-button"
         />);
  }
};
