export class Site {

  constructor() {
    this.boards = [];
    this.users = [];
    this.user = {email: ''};
  }

  update(data) {
    if (data.site) {
      Object.assign(this, data.site);
    }
    if (data.user) {
      this.user = data.user;
    }
  }
}
