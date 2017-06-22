import React from 'react';
import {TooltipIconButton} from './util';

import {has_text} from '../model/hastext';

import {DropZone} from './dnd';
import {Reveal, Revealable, RevealButton} from './revealbutton';

class TheBag extends Revealable {

  size() {
    return '(' + this.props.board.archive_count + ')';
  }

  dropped(dt) {
    this.props.api.archive(dt.getData('text/id'));
  }

  search() {
    console.log("searching");
    this.props.api.get_archived(this.state.search, 0, 9, (features) => {
      this.setState({
        features: features,
        archive_count: this.props.board.archive_count
      });
    });
  }
  
  features () {
    if (this.state.expanded) {
      if (! this.state.features ||
          this.props.board.archive_count !== this.state.archive_count) {
        this.search();
      }

      if (! this.state.features || this.state.features.length < 1) {
        return <div>Nothing in the bag.</div>;
      }

      return this.state.features.map((feature) => {
        return (
          <ArchivedFeature
             feature={feature} key={feature.id}
             api={this.props.api}
             />
        );
      });
    }
    this.state.features = null; // Clear search
    return null;
  }

  render() {

    return (
      <DropZone className="kb-the-bag" disallow={['task']}
                dropped={(dt) => this.dropped(dt)} >
        <div className="kb-w-right-thing">
          <h1>The Bag {this.size()}</h1>
          <RevealButton expanded={this.state.expanded}
                        toggle={this.toggle_explanded.bind(this)}
                        />
        </div>
        <div className="kb-archived-features">{this.features()}</div>
        
      </DropZone>
    );

  }
  
}

class ArchivedFeature extends Revealable {

  constructor(props) {
    super(props);
    this.update_stats();
  }

  update_stats() {
    this.count = 0;
    this.size = 0;
    this.complete = 0;
    this.props.feature.tasks.forEach((task) => {
      this.count += 1;
      this.size += task.size;
      if (task.history[task.history.length - 1].complete) {
        this.complete += task.size;
      }
    });
  }

  title() {
    return this.props.feature.title +
      ' [' + this.complete + '/' + this.size + ']';
  }

  details() {
    if (has_text(this.props.feature.description)) {
      return (
        <div className="kb-archived-features-description"
           dangerouslySetInnerHTML={{__html: this.props.feature.description}}
          />
      );
    }
    return null;
  }

  tasks() {
    return this.props.feature.tasks.map(
      (task) => <ArchivedTask task={task} key={task.id} />);
  }

  restore() {
    this.props.api.restore(this.props.feature.id);
  }

  render() {
    return (
      <div className="kb-archived-feature">
        <div className="kb-w-right-thing">
          <h2>{this.title()}</h2>
          <RevealButton expanded={this.state.expanded}
                        toggle={this.toggle_explanded.bind(this)}
                        />
        </div>
        <Reveal expanded={this.state.expanded}>
          {this.details()}
          {this.tasks()}
          <TooltipIconButton
             icon="unarchive"
             onMouseUp={() => this.restore()}
             tooltip="Take this feature from the bag and work on it some more."
            />
        </Reveal>
      </div>
    );
  }
}


class ArchivedTask extends Revealable {

  title() {
    const {task} = this.props;
    return task.title + (task.size > 1 ? ' [' + task.size + ']' : '');
  }

  details() {
    const {task} = this.props;
    if (has_text(task.description)) {
      return (
        <div className="kb-archived-features-description"
             dangerouslySetInnerHTML={{__html: task.description}}
             />
      );
    }
    return null;
  }

  render() {
    return (
      <div className="kb-archived-task">
        <div className="kb-w-right-thing">
          <h3>{this.title()}</h3>
          <RevealButton expanded={this.state.expanded}
                        toggle={this.toggle_explanded.bind(this)}
                        />
        </div>
        <Reveal expanded={this.state.expanded}>
          {this.details()}
        </Reveal>
      </div>
    );
  }
}

module.exports = {
  TheBag: TheBag
};
