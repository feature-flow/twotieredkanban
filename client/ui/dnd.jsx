
/* HTML5-based Drag and Drop supprt

   Draggable components have a data prop containing drag data.

   DropZone components have props:

   dropped
     Callable called with drag data on a drop

   disallow
     List of data ids or types that can't be dropped.

     (This is a little warty.  Maybe it would be better to move this
      abstraction out and just have an allowed property giving a guard
      function.)

 */

/* A Note on the weirdness of this implementation and HTML5 drag and drop.
 
   First, I considered using react-dnd, but it seems overly complex.
   I'm pretty happy with the simplicity of use of this
   implementation. Perhaps I'll change my mind later, especially to
   get support for mobile.

   The HTML5 drag and drop spec provides a dataTransfer object to hold
   drag-related data, but it doesn't make that data available when
   dragging over.  This means that data aren't available to decide if
   drags are legal.  Weirdly, type/format names *are* available.  A
   common hack is to imbed data in type names, as in: text/1234 to save
   the id 1234.  Unfortunately, this doesn't work in Edge and IE because
   they are more restrictive about type names.

   Apparently, the expected way to deal with this is to use a global
   variable to hold data, because TCBOO drag at once. (The spec was
   based on a MS implementation that assumed only one drag can happen
   at a time.)

 */

import React from 'react';
import classes from 'classnames';

let data; // There can be only one and the HTML5 drag-and-drop spec is dumb.

export class Draggable extends React.Component {

  constructor(props) {
    super(props);
    this.state = {class_name: ''};
  }

  render() {

    const dragstart = (ev) => {
      if (! (ev.dataTransfer.types && ev.dataTransfer.types.length)) {
        data = this.props.data;
        this.setState({class_name: 'dragging'});
        // Needed to prevent container drag data overriding contained drag data
        ev.dataTransfer.setData('text/plain', '');
      }
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

export class DropZone extends React.Component {
  
  constructor(props) {
    super(props);
    this.dragin = 0;
    this.state = {dragover: false};
  }

  allowed(ev) {
    return data &&
      this.props.disallow.filter((t) => t == data.id || t == data.type)
      .length == 0;
  }
  
  dragover(ev) {
    if (this.allowed(ev)) {
      ev.preventDefault();
      return false;
    }
    else {
      return true;
    };
  }

  dragenter(ev) {
    if (this.allowed(ev)) {
      if (this.dragin < 1) {
        this.dragin = 1;
        this.setState({dragover: true});
      }
      else {
        this.dragin += 1;
      }
    }
  }

  dragleave() {
    this.dragin -= 1;
    if (this.dragin == 0) {
      this.setState({dragover: false});
    }
  }

  drop(ev) {
    ev.preventDefault();
    this.dragleave();
    this.props.dropped(data);
    data = undefined;
  }
  
  render() {
    const className = classes(
      this.props.className,
      {dragover: this.state.dragover});
    
    return (
      <div className={className}
           onDragEnter={(ev) => this.dragenter(ev)}
           onDragLeave={(ev) => this.dragleave(ev)}
           onDragOver={(ev) => this.dragover(ev)}
           onDrop={(ev) => this.drop(ev)}
           >
        {this.props.children}
      </div>
    );
  }
}

DropZone.defaultProps = {disallow: []};
