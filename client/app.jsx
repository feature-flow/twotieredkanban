const React = require('react');
const ReactDOM = require('react-dom');
const {Route, Router, IndexRoute, hashHistory} = require('react-router');

const Main = require('Main');
const Boards = require('Boards');
const Board = require('Board');
const Login = require('Login');

require('style-loader!css-loader!sass-loader!applicationStyles');

ReactDOM.render(
<Router history={hashHistory}>
  <Route path="/" component={Main}>
    <IndexRoute component={Boards} />
    <Route path="board/:id" component={Board} />
    <Route path="login" component={Login} />
  </Route>
</Router>,
document.getElementById('app')
);
