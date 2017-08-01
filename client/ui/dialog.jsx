import React from 'react';
import RTDialog from 'react-toolbox/lib/dialog';
import Dropdown from 'react-toolbox/lib/dropdown';
import RTInput from 'react-toolbox/lib/input';
import RichTextEditor from 'react-rte';

export class Dialog extends React.Component {

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
    const {action, extra_actions, children, title, type} = this.props;
    const cancel = () => this.hide();
    const actions = [{label: "Cancel (esc)", onClick: cancel},
                     {label: action || "Ok",
                      onClick: () => this.finish()
                     }]
            .concat(extra_actions || []);
    
    return (
      <RTDialog
         actions={actions}
         active={this.state.active}
         onEscKeyDown={cancel}
         onOverlayClick={cancel}
         title={title}
         type={type || "normal"}
         className="kb-scrollable"
         >
        {children}
      </RTDialog>
    );
  }
}

export class Input extends React.Component {

  focus() {
    this.input.focus();
  }

  on_key_press(ev) {
    if (ev.key == "Enter" && this.props.onEnter) {
      this.props.onEnter();
    }
  }

  render() {
    const props = Object.assign({}, this.props);
    delete props.onEnter;
    
    return (
      <RTInput
         {...props}
         value={this.props.onChange()}
         error={this.props.onChange.error()}
         innerRef={(c) => {this.input = c;}}
         onKeyPress={(ev) => this.on_key_press(ev)}
         />
    );
  }
}

export class Editor extends React.Component {

  render () {
    return (
      <RichTextEditor
         value={this.props.onChange()}
        onChange={this.props.onChange}
      />
    );
  }
}

export class Select extends React.Component {

  render() {
    const source = this.props.source.map(
      (s) => (typeof s === 'object' ? s : {label: s, value: s})
    );
    
    return (
      <Dropdown {...this.props}
                source={source} value={this.props.onChange()}
         />
    );
  }
}

const validate_required =
        (v, name) => v ? null : "Please provide a value for " + name + ".";


export class DialogBase extends React.Component {

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
    this.should_focus = true;
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
  
  componentDidUpdate() {
    if (this.refs.focus && this.should_focus) {
      this.refs.focus.focus();
      this.should_focus = false;
    }
  }
}

export const show_dialog = (dialog, state) => () => dialog.show(state);

export class Confirm extends DialogBase {
  render() {
    return (
      <Dialog
         title={this.props.title || "Are you sure?"}
         action={this.props.action || "Ok"}
         ref="dialog"
         finish={this.props.finish}
         type="Small"
         >
        {this.props.text}
      </Dialog>
    );
  }
}

export const large =
  navigator.userAgent.indexOf('Safari/') >= 0 &&
  navigator.userAgent.indexOf('Chrome/') < 0 &&
  navigator.userAgent.indexOf('Chromium/') < 0
  ? 'normal' : 'large';

