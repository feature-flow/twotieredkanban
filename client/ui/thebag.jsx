import React from 'react';

import {DropZone} from './dnd';
import {RevealButton} from './revealbutton';

class TheBag extends React.Component {

  constructor (props) {
    super(props);
    this.state = {};
  }

  toggle_explanded() {
    this.setState({expanded: ! this.state.expanded});
  }

  size() {
    return '(' + this.props.board.archive_count + ')';
  }

  dropped(dt) {
    this.props.api.archive(dt.getData('text/id'));
  }

  render() {

    return (
      <DropZone className="kb-the-bag" disallow={['task']}
                dropped={(dt) => this.dropped(dt)} >
        <div className="kb-w-right-thing">
          <div>The Bag {this.size()}</div>
          <RevealButton expanded={this.state.expanded}
                        toggle={this.toggle_explanded.bind(this)}
                        />
        </div>
      </DropZone>
    );

  }
  
}

module.exports = {
  TheBag: TheBag
};
