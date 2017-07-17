import React from 'react';
import Input from 'react-toolbox/lib/input';

import {has_text} from '../model/hastext';

import {Batch} from './search';
import {DropZone} from './dnd';
import {Reveal, Revealable, RevealButton} from './revealbutton';
import {TooltipIconButton} from './util';

const SEARCH_BATCH_SIZE = 9;

export class TheBag extends Revealable {

  constructor(props) {
    super(props);
    this.state.search = '';
  }
  
  size() {
    return '(' + this.props.board.archive_count + ')';
  }

  dropped(dt) {
    this.props.api.archive(dt.getData('text/id'));
  }

  search(start=0) {
    console.log("searching");
    this.props.api.get_archived(this.state.search, start, SEARCH_BATCH_SIZE);
  }
  
  features () {
    if (this.state.expanded) {
      const results = this.props.search_results;
      
      if (! results) {
        this.search();
        return null;
      }

      const features = results.features.map((feature) => {
        return (
          <ArchivedFeature
             feature={feature} key={feature.id}
             api={this.props.api}
             />
        );
      });
      return (
        <div>
          <Input
             label="Search"
             icon="search"
             value={this.state.search}
             onChange={(v) => this.search_input(v)}
             />
            {features}
            <Batch start={results.start}
                   size={SEARCH_BATCH_SIZE}
                   count={results.count}
                   go={(pos) => this.search(pos)}
                   />
        </div>
      );
    }
    this.state.features = null; // Clear search
    return null;
  }

  clear_search_timeout() {
    if (this.search_timeout) {
      clearTimeout(this.search_timeout);
      this.search_timeout = undefined;
    }
  }
  
  search_input(v) {
    this.clear_search_timeout();
    this.setState({search: v});
    const timeout = setTimeout(() => {
      if (timeout === this.search_timeout) {
        this.search();
        this.search_timeout = undefined;
      }
    }, 500);
    this.search_timeout = timeout;
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
        {this.features()}
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
