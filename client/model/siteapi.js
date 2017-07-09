import APIBase from './apibase';
import {Site} from './site';

module.exports = class extends APIBase {
  constructor(view) {
    super(new Site(), view, '/site/');
  }

  add_user(email, name, admin) {
    this.post('/auth/invites', {email: email, name: name || '', admin: admin});
  }

  change_user_type(id, admin) {
    this.put('/auth/users/' + id + '/type', {admin: admin});
  }

  get_requests(f) {
    this.get('/auth/requests').then((resp) => {
      f(resp.data.requests);
    });
  }

  approve(email, f) {
    this.put('/auth/requests/'+email).then(f);
  }
};
