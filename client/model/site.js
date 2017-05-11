class Site {

  constructor() {
    this.boards = [];
  }

  update(data) {
    this.boards = data.site.boards;
  }
    
}

module.exports = {
  Site: Site
};
