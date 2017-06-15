import expect from 'expect';
import {Board} from '../model/board';

const states = [
  {"id": "Ready", "title": "Ready", "order": 2, "complete": false,
   "working": false, explode: false, "task": false },
  {"id": "Backlog", "title": "Backlog", "order": 0,
   "complete": false, "working": false, explode: false, "task": false },
  {"id": "Development", "title": "Development", "order": 3,
   "complete": false, "working": false, explode: true, "task": false},
    {"id": "ready", "title": "Ready", "task": true, "order": 4,
     "complete": false, "working": false, explode: false
    },
    {"id": "Needs review", "title": "Needs review", "task": true, "order": 6,
     "complete": false, "working": false, explode: false },
    {"id": "Doing", "title": "Doing", "task": true, "order": 5,
     "complete": false, "working": true, explode: false },
    {"id": "Done", "title": "Done", "task": true, "order": 7,
     "complete": true, "working": false, explode: false},
  {"id": "Deployed", "title": "Deployed", "order": 8,
   "complete": false, "working": false, explode: false, "task": false}];

const boards = [
  {name: 'test', title: 'Test', description: 'test board'},
  {name: 'test2', title: 'Another', description: 'nother board'}];

function task(id, order, data) {
  const task = {
    "blocked": null, "assigned": null, "created": 1494531763.295133,
    "description": "", "complete": null, order: order,
    "size": 1, "id": id, "state": null, "title": id, "parent": null,
    history: [{}]
  };
  if (data) {
    Object.assign(task, data);
  }
  return task;
}

function initialized_board() {
  const board = new Board('test');
  board.update({
    board: {name: 'dev', title: 'Test', description: 'test board'},
    site: {boards: boards, users: []},
    states: {adds: states}});
  return board;
}

describe("Kanban Board", () => {

  it("Should initialize", () => {
    const board = new Board('test');
    expect(board.name).toBe('test');
    expect(board.boards).toEqual([]);
    expect(board.users).toEqual([]);
  });

  it("Should handle its own data", () => {
    const board = initialized_board();
    expect(board.name).toBe("test");
    expect(board.title).toBe("Test");
    expect(board.description).toBe("test board");
    expect(board.boards).toEqual(boards);
    expect(board.users).toEqual([]);
    expect(board.project_states.map((s) => ({id: s.id, title: s.title})))
      .toEqual([
        {"id": "Backlog", "title": "Backlog"},
        {"id": "Ready", "title": "Ready"},
        {"id": "Development", "title": "Development"},
        {"id": "Deployed", "title": "Deployed"}
      ]);
    expect(board.task_states.map((s) => ({id: s.id, title: s.title})))
      .toEqual([
        {"id": "ready", "title": "Ready"},
        {"id": "Doing", "title": "Doing"},
        {"id": "Needs review", "title": "Needs review"},
        {"id": "Done", "title": "Done"},
      ]);
  });

  it("should handle tasks in states", () => {
    const board = initialized_board();
    board.update({tasks: {adds: [
      task('t1', 1, {parent: 'p1'}),
      task('t2', 2, {parent: 'p1', state: 'ready'}),
      task('t3', 3, {parent: 'p1', state: 'Doing'}),
      task('p1', 4),
      task('p2', 5, {state: 'Development'})
    ]}});

    expect(board.subtasks('Backlog').map((t) => t.id)).toEqual(['p1']);
    expect(board.subtasks('Development').map((t) => t.id)).toEqual(['p2']);
    expect(board.subtasks('Ready')).toEqual([]);
    expect(board.subtasks('Deployed')).toEqual([]);

    expect(board.tasks['p1'].subtasks('ready').map((t) => t.id))
      .toEqual(['t1', 't2']);
    expect(board.tasks['p1'].subtasks('Doing').map((t) => t.id))
      .toEqual(['t3']);
    expect(board.tasks['p1'].subtasks('Needs review')).toEqual([]);
    expect(board.tasks['p1'].subtasks('Done')).toEqual([]);

    // Now move some things around
    board.update({tasks: {adds: [
      task('p1', 1, {state: 'Development'}),
      task('t1', 3, {parent: 'p1', state: 'Doing'}),
      task('t2', 2, {parent: 'p1', state: 'Doing'}),
      task('t3', 1, {parent: 'p1', state: 'Doing'}),
      task('p2', 0, {parent: 'p1', state: 'Doing'})
    ]}});
    expect(board.subtasks('Backlog')).toEqual([]);
    expect(board.subtasks('Development').map((t) => t.id)).toEqual(['p1']);
    expect(board.subtasks('Ready')).toEqual([]);
    expect(board.subtasks('Deployed')).toEqual([]);

    expect(board.tasks['p1'].subtasks('ready')).toEqual([]);
    expect(board.tasks['p1'].subtasks('Needs review')).toEqual([]);
    expect(board.tasks['p1'].subtasks('Done')).toEqual([]);
    expect(board.tasks['p1'].subtasks('Doing').map((t) => t.id))
      .toEqual(['p2', 't3', 't2', 't1']);
  });

  it("should compute stats on update", () => {
    const board = initialized_board();
    board.update({tasks: {adds: [
      task('t1', 1, {parent: 'p1', size: 1, history: [{complete: true}]}),
      task('t2', 2, {parent: 'p1', size: 2, history: [{complete: true}]}),
      task('t3', 3, {parent: 'p1', size: 3}),
      task('p1', 4),
      task('p2', 5, {state: 'Development'})
    ]}});
    expect(board.tasks['p1'].count).toBe(3);
    expect(board.tasks['p1'].total_size).toBe(6);
    expect(board.tasks['p1'].total_completed).toBe(3);
    expect(board.tasks['p2'].count).toBe(0);
    expect(board.tasks['p2'].total_size).toBe(0);
    expect(board.tasks['p2'].total_completed).toBe(0);
  });

  it("should update user on existing task", () => {
    const board = initialized_board();
    board.update(
      {
        tasks: {adds: [
          task('t1', 1, {parent: 'p1', size: 1, history: [{complete: true}]}),
          task('p1', 4),
        ]},
        site: {
          users: [{"id": "gal", "nick": "gal", "email": "gal@example.com",
                   "name": "Gal Humana"}]
        }
        });
    expect(board.tasks['t1'].user).toBe(undefined);
    board.update({tasks: {adds: [
      task('t1', 1,
           {assigned: 'gal',
            parent: 'p1', size: 1, history: [{complete: true}]}),
    ]}});
    expect(board.tasks['t1'].user.id).toBe('gal');
    expect(board.tasks['t1'].user.nick).toBe('gal');
    expect(board.tasks['t1'].user.name).toBe('Gal Humana');
    expect(board.tasks['t1'].user.email).toBe('gal@example.com');
  });

});
