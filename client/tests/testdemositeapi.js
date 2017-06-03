import expect from 'expect';
import indexedDB from 'indexedDB';

import SiteAPI from '../demo/siteapi';

describe("demo site api", () => {

  afterEach("Clean up database", (done) => {
    SiteAPI.test_reset(done);
  });

  it("should set up initial state", (done) => {
    const view = {setState: expect.createSpy()};
    new SiteAPI(view, (api) => {
      const model = api.model;
      expect(view.setState).toHaveBeenCalledWith({model: model});
      expect(model.boards).toEqual([]);
      expect(model.user).toEqual(
        {id: "ryou", nick: "ryou", email: "ryou@example.com",
         name: "Ryou Bosso", admin: true, current: true});
      expect(model.users).toEqual([
        {"id": "alex", "nick": "alex", "email": "alex@example.com",
         "name": "Alex Peeple"},
        {"id": "cas", "nick": "cas", "email": "cas@example.com",
         "name": "Cas Emplo"},
        {"id": "gal", "nick": "gal", "email": "gal@example.com",
         "name": "Gal Humana"},
        {"id": "jaci", "nick": "jaci", "email": "jaci@example.com",
         "name": "Jaci Admi", "admin": true},
        {"id": "kiran", "nick": "kiran", "email": "kiran@example.com",
         "name": "Kiran Persons"},
        {"id": "ryou", "nick": "ryou", "email": "ryou@example.com",
         "name": "Ryou Bosso", "admin": true, "current": true}
      ]);
      done();
    });
  });

  it("should add boards with a name", (done) => {
    const view = {setState: expect.createSpy()};
    new SiteAPI(view, (api) => {
      api.add_board('test', () => {
        view.setState.restore();
        api.add_board('test2', () => {
          const model = api.model;
          expect(view.setState).toHaveBeenCalledWith({model: model});
          expect(model.boards)
            .toEqual([
              {name: 'test', title: '', description: ''},
              {name: 'test2', title: '', description: ''}]);
          done();
        });
      });
    });
  });

  describe("User-management common to site and boards", () => {

    it("should switch users", (done) => {

      const view = {setState: expect.createSpy()};
      new SiteAPI(view, (api) => {
        const model = api.model;
        expect(api.user.id).toBe('ryou');
        expect(model.user.id).toBe('ryou');
        api.switch_user('cas', () => {
          expect(api.user.id).toBe('cas');
          expect(model.user.id).toBe('cas');
          api.transaction('users', 'readonly', (trans) => {
            api.users(trans, () => {
              expect(api.user.id).toBe('cas');
              trans.oncomplete = () => done();
            });
          });
        });
      });
    });
  });
  
});
