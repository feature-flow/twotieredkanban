import expect from 'expect';
import indexedDB from 'indexedDB';
import SiteAPI from '../model/demositeapi';

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
  
});
