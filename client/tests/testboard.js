import expect from 'expect';
import {Board} from '../model/board';

describe("Kanban Board", () => {

  it("Should initialize", () => {
    const board = new Board('test');
    expect(board.name).toBe('test');
    expect(board.site).toEqual({boards: []});
  });
});
