// HTML5-based Drag and Drop supprt

import React from 'react';
import classes from 'classnames';

class Draggable extends React.Component {

  constructor(props) {
    super(props);
    this.state = {class_name: ''};
  }

  render() {

    const dragstart = (ev) => {
      if (! ev.dataTransfer.types.length) {
        const data = this.props.data;
        for (const name in data) {
          ev.dataTransfer.setData(name, data[name]);
        }
      }
      this.setState({class_name: 'dragging'});
    };
    const dragend   = () => this.setState({class_name: ''});
    
    return (
      <div draggable="true"
           className={this.state.class_name}
           onDragStart={dragstart}
           onDragEnd={dragend}
           >
        {this.props.children}
      </div>
    );
  }
}

class DropZone extends React.Component {

  // TODO: drop condition (when I get to dropping into projects)

  constructor(props) {
    super(props);
    this.state = {dragover: false};
  }

  render() {

    const dragover = (ev) => {ev.preventDefault(); return false; };
    const dragenter = () => this.setState({dragover: true});
    const dragleave = () => this.setState({dragover: false});

    const drop = (ev) => {
      ev.preventDefault();
      dragleave();
      this.props.dropped(ev.dataTransfer);
    };

    const className = classes(
      this.props.className,
      {dragover: this.state.dragover});
    
    return (
      <div draggable="true"
           className={className}
           onDragEnter={dragenter}
           onDragLeave={dragleave}
           onDragOver={dragover}
           onDrop={drop}
           >
        {this.props.children}
      </div>
    );
  }
}

module.exports = {
  Draggable: Draggable,
  DropZone: DropZone
};
