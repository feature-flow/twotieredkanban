import React from 'react';
import ReactDOM from 'react-dom';
import {Route, Router, IndexRoute, hashHistory} from 'react-router';

import {AdminUI, Site} from './ui/site';
import {Board} from './ui/board';

require('./styles/app.scss');

class Main extends React.Component {
  render() {
    return (
      <div>
        {this.props.children}
      </div>
      );
  }
}

const NotFound = (props) => {
  window.location.hash = '#/';
  return <div>Not found</div>;
};

ReactDOM.render(
  <Router history={hashHistory}>
    <Route path="/" component={Main}>
      <IndexRoute component={Site} />
      <Route path="admin" component={AdminUI} />
      <Route path="board/:name" component={Board} />
      <Route path="**" component={NotFound} />
    </Route>
  </Router>,
  document.getElementById('app')
);
