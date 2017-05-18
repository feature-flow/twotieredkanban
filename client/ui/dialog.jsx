import React from 'react';
import {Dialog, Input} from 'react-toolbox';
import RichTextEditor from 'react-rte';

class Dialog_ extends React.Component {

  constructor() {
    super();
    this.state = { active: false };
  }

  show() {
    this.setState({active: true});
  }

  hide() {
    this.setState({active: false});
  }

  finish() {
    if (! this.props.finish()) {
      this.hide();
    }
  }

  render() {
    const cancel = () => this.hide();
    const actions = [{label: "Cancel", onClick: cancel},
                     {label: this.props.action || "Ok",
                      onClick: () => this.finish()
                     }];
    return (
      <Dialog
         actions={actions}
         active={this.state.active}
         onEscDown={cancel}
         onOverlayClick={cancel}
         title={this.props.title}
         type={this.props.type || "normal"}
         >
        {this.props.children}
      </Dialog>
    );
  }
}

class Input_ extends React.Component {

  render() {
    return (
      <Input {...this.props} value={this.props.onChange()} />
    );
  }
}

class Editor extends React.Component {

  render () {
    return (
      <RichTextEditor
         value={this.props.onChange()}
        onChange={this.props.onChange}
      />
    );
  }
}

class DialogBase extends React.Component {
  constructor() {
    super();
    this.state = {};
  }

  val(name, default_='') {
    return (v) => {
      if (v == undefined) {
        return this.state[name] || default_;
      }
      else {
        const state = {};
        state[name] = v;
        return this.setState(state);
      }
    };
  }

  show(state) {
    if (state) {
      this.setState(state);
    }
    else {
      this.state = {};
      this.setState(this.state);
    }
    this.refs.dialog.show();
  }
}

module.exports = {
  Dialog: Dialog_,
  Input: Input_,
  Editor: Editor,
  DialogBase: DialogBase
};
