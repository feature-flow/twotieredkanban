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

  validate() {
    let valid = true;
    React.Children.forEach(this.props.children, (c) => {
      if (c.props && c.props.onChange && c.props.onChange.validate) {
        if (! c.props.onChange.validate(c.props.onChange)) {
          valid = false;
        };
      }
    });
    return valid;
  }

  finish() {
    if (this.validate()) {
      if (! this.props.finish()) {
        this.hide();
      }
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
         className="kb-scrollable"
         >
        {this.props.children}
      </Dialog>
    );
  }
}

class Input_ extends React.Component {

  render() {
    return (
      <Input {...this.props}
             value={this.props.onChange()}
             error={this.props.onChange.error()}
             />
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

const validate_required =
        (v, name) => v ? null : "Please provide a value for " + name + ".";


class DialogBase extends React.Component {

  constructor() {
    super();
    this.state = {_DialogBase_validations: 0};
    this.errors = {};
  }

  validated() {
    this.setState(
      {_DialogBase_validations: this.state._DialogBase_validations + 1});
  }

  val(name, default_='', validate=undefined) {
    const onChange = (v) => {
      if (v == undefined) {
        return this.state[name] || default_;
      }
      else {
        const state = {};
        state[name] = v;
        if (validate) {
          this.errors[name] = validate(v);
        }
        return this.setState(state);
      }
    };
    
    onChange.error = () => {
      return this.errors[name];
    };
    
    if (validate) {
      onChange.validate = (v) => {
        this.validated(); // force render
        this.errors[name] = validate(onChange(), name, this);
        return ! this.errors[name];
      };
    }
    return onChange;
  }

  required(name) {
    return this.val(name, '', validate_required);
  }

  show(state) {
    this.errors = {};
    this.state = {};
    if (state) {
      this.setState(state);
    }
    else {
      this.setState(this.state);
    }
    this.refs.dialog.show();
  }
}

module.exports = {
  Dialog: Dialog_,
  Input: Input_,
  Editor: Editor,
  DialogBase: DialogBase,
  show_dialog: (dialog, state) => () => dialog.show(state)
};
