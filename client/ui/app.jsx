import React from 'react';

export class Base extends React.Component {

    constructor(props) {
      super(props);
      this.active = false;
      this.visibility_changed = () => {
        if (document.hidden) {
          console.log('hidden', new Date());
          this.api.stop();
        }
        else if (this.active) {
          console.log('unhidden', new Date());
          this.api.start();
        }
      };
      this.api = this.new_api(props);
      this.state = {model: this.api.model};
    }

    componentWillUnmount() {
      this.active = false;
      document.removeEventListener("visibilitychange", this.visibility_changed);
      this.api.stop();
    }

    componentWillMount() {
      this.active = true;
      document.addEventListener("visibilitychange", this.visibility_changed);
      this.visibility_changed();
    }
  
    componentWillReceiveProps(nextProps) {
      if (nextProps.params.name !== this.props.params.name) {
        this.api.stop();
        this.api = this.new_api(nextProps);
        this.setState({model: this.api.model});
        if (! document.hidden) {
          this.api.start();
        }
      }
    }
}
