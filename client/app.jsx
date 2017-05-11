const React = require('react');
const ReactDOM = require('react-dom');
const {Route, Router, IndexRoute, hashHistory} = require('react-router');

const Main = require('Main');
const Site = require('Site');
const Board = require('Board');
const Login = require('Login');

require('style-loader!css-loader!sass-loader!applicationStyles');

ReactDOM.render(
<Router history={hashHistory}>
  <Route path="/" component={Main}>
    <IndexRoute component={Site} />
    <Route path="board/:name" component={Board} />
    <Route path="login" component={Login} />
  </Route>
</Router>,
document.getElementById('app')
);
