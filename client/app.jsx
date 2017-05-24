const React = require('react');
const ReactDOM = require('react-dom');
const {Route, Router, IndexRoute, hashHistory} = require('react-router');

const Main = require('./ui/main');
const Site = require('./ui/site');
const Board = require('./ui/board');

require('style-loader!css-loader!sass-loader!applicationStyles');

ReactDOM.render(
<Router history={hashHistory}>
  <Route path="/" component={Main}>
    <IndexRoute component={Site} />
    <Route path="board/:name" component={Board} />
  </Route>
</Router>,
document.getElementById('app')
);
