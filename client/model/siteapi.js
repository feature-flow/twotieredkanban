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
    this.put('/auth/users/' + id, {admin: admin});
  }

  get_invites(f) {
    this.get('/auth/invites').then((resp) => {
      f(resp.data.invites);
    });
  }
};
