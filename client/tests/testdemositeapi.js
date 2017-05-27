import expect from 'expect';
import SiteAPI from '../model/demositeapi';

describe("demo site api", () => {

    it("should be able to access SiteAPI", () => {
        expect(SiteAPI).toExist();
    });
    
});
