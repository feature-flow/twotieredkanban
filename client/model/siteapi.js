import APIBase from './apibase';
import {Site} from './site';

module.exports = class extends APIBase {
  constructor(view) {
    super(new Site(), view, '/site/');
  }
};
