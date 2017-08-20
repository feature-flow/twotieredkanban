/*

Dialog helpers

The react-toolbox Dialog component and input compnents (input and
dropdown) are pretty good at displaying dialogs and inputs, but they
don't manage data very well.  The components defined here help with
that.  There's also an Editor input that wraps the RichTextEditor
component from react-rte.

I suggest looking at some examples as you read this.

To create a data-input (or edit) dialog you:

- Subclass DialogBase.

  In your render method, you return a Dialog (the one defined here)
  component around some input components (and whatever other
  components you want).

  The Dialog component must be given properties:

  - ref="dialog"

    You must supply this prop and it must have this value.  This is
    needed to make automation for displaying dislogs work.  Hopefully,
    there's a way around this that I just haven't found yet.

  - title="YOUR TITLE"

  - action="YOUR OK ACTION"

    This is what's displayed on the OK button. It defaults to "Ok".

  - finish()

    A callback function that's called when user clicks OK and there
    aren't validation errors.  This function isn't called with
    data. The input data is in ``this.state``.

  - type (see react-toolbox docs)

- On your input components, supply an ``onChange`` property that is
  the result of calling ``this.val('NAME')``. 

  For example:

     <Select label='Size' source={[1, 2, 3, 5, 8, 13]}
             onChange={this.val("size", 1)} />

  The val method is a little magical. It returns an onChange handler
  that updates your dialog's state with the value set, using the name
  given. The components provided here call the onChange handler
  without a value to get the current value, so you don't have to
  provide a value explicitly.

  The ``val`` method takes up to 3 arguments:

  - the name of the state propery to be used as input and provided as
    output.

  - A default value to use if the state value is undefined.

  - A validation function.  The validation function is passed: the
    value to be validated, the state name, and your custom dialog
    instance.  Is the value is invalid, the validation function should
    return an error message, otherwise, if the value is valid, it
    should return any false value.

  Instead of ``val``, you can use ``required('NAME')``, which in turn
  calls ``val`` with a validation function that checks for a true
  value (typically a non-empty string).

  For example:

    <Input label='Title' required={true} onChange={this.required("title")} />


- Render an instance of your custom dialog component somewhere.  Give
  it a ``ref`` ref you can use to fetch it when you want to display
  the dialog (e.g. in an onClick handler).  To display the dialog,
  call it's ``show()`` method.  You may pass an object containing
  initial state.

*/

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

