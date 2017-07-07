import json
import mock
from testvars import Vars
import unittest
import ZODB
from ZODB.utils import u64

from ..apiutil import Encoder

def reduce(data):
    return json.loads(json.dumps(data, cls=Encoder))

class BoardTests(unittest.TestCase):

    maxDiff = None


    def setUp(self):
        from ..site import Site
        self.conn = ZODB.connection(None)
        self.conn.root.site = self.site = Site('Test site')
        self.site.add_board('dev', 'Development', 'Development projects')
        self.board = self.site.boards['dev']
        self.board_generation = self.board.generation
        self.conn.transaction_manager.commit()

    def updates(self):
        updates = self.board.updates(self.board_generation)
        self.board_generation = updates.pop('generation')
        return updates

    def test_initial_data(self):
        vars = Vars()
        self.assertEqual(
            dict(generation=self.board_generation,
                 states=dict(adds=vars.states),
                 board=self.board,
                 site=self.site,
                 zoid = str(u64(self.board.changes._p_oid)),
                 ),
            self.board.updates(0))

        self.assertEqual(
            [{'complete': False, 'explode': False, 'id': 'Backlog',
              'order': 0, 'task': False, 'title': 'Backlog',
              'working': False},
             {'complete': False, 'explode': False, 'id': 'Ready',
              'order': 1, 'task': False, 'title': 'Ready', 'working': False},
             {'complete': False, 'explode': True, 'id': 'Development',
              'order': 2, 'task': False, 'title': 'Development',
              'working': True},
             {'complete': False, 'explode': False, 'id': 'ready',
              'order': 3, 'task': True, 'title': 'Ready', 'working': False},
             {'complete': False, 'explode': False, 'id': 'Doing',
              'order': 4, 'task': True, 'title': 'Doing', 'working': True},
             {'complete': False, 'explode': False, 'id': 'Needs review',
              'order': 5, 'task': True, 'title': 'Needs review',
              'working': False},
             {'complete': False, 'explode': False, 'id': 'Review',
              'order': 6, 'task': True, 'title': 'Review', 'working': True},
             {'complete': True, 'explode': False, 'id': 'Done',
              'order': 7, 'task': True, 'title': 'Done', 'working': False},
             {'complete': False, 'explode': False, 'id': 'Acceptance',
              'order': 8, 'task': False, 'title': 'Acceptance',
              'working': True},
             {'complete': False, 'explode': False, 'id': 'Deploying',
              'order': 9, 'task': False, 'title': 'Deploying',
              'working': True},
             {'complete': False, 'explode': False, 'id': 'Deployed',
              'order': 10, 'task': False, 'title': 'Deployed',
              'working': False}],
            reduce(vars.states))

        self.assertEqual(len(set(state.id for state in vars.states)),
                         len(vars.states))

    def test_json(self):
        self.assertEqual(
            dict(name='dev', title='Development', archive_count=0,
                 description='Development projects'),
            self.board.json_reduce())

    def test_update(self):
        self.board.update('do', 'Do things', 'Get things done')
        self.assertEqual(
            dict(name='do', title='Do things', archive_count=0,
                 description='Get things done'),
            self.board.json_reduce())

        vars = Vars()
        self.assertEqual(
            dict(generation=vars.generation,
                 board=self.board, site=self.site),
            self.board.updates(self.board_generation))
        self.assertTrue(vars.generation > self.board_generation)

    def test_new_project(self):
        self.board.new_project('first', 42, 'Do First thing')
        vars = Vars()
        self.assertEqual(
            dict(generation=vars.generation,
                 tasks=dict(adds=[vars.project])),
            self.board.updates(self.board_generation))
        self.assertEqual('first'         , vars.project.title)
        self.assertEqual(42              , vars.project.order)
        self.assertEqual('Do First thing', vars.project.description)

        self.assertTrue(vars.generation > self.board_generation)

    def test_new_task(self):
        vars = Vars()
        self.board.new_project('first', 42, 'Do First thing')
        self.assertEqual(
            dict(generation=vars.board_generation,
                 tasks=dict(adds=[vars.project])),
            self.board.updates(self.board_generation))

        self.board.new_task(
            vars.project.id, 'a sub', 43, 'A First subtask')
        self.assertEqual(
            dict(generation=vars.generation,
                 tasks=dict(adds=[vars.task])),
            self.board.updates(vars.board_generation))
        self.assertTrue(vars.generation > vars.board_generation)

        self.assertEqual('a sub'          , vars.task.title)
        self.assertEqual(43               , vars.task.order)
        self.assertEqual('A First subtask', vars.task.description)
        self.assertEqual(vars.project, vars.task.parent)


    def test_update_some(self):
        self.board.new_project('first', 42, 'Do First thing')
        vars = Vars()
        self.assertEqual(
            dict(generation=vars.board_generation,
                 tasks=dict(adds=[vars.project])),
            self.board.updates(self.board_generation))

        self.board.update_task(vars.project.id, assigned='j1m')
        self.assertEqual(
            dict(generation=vars.generation,
                 tasks=dict(adds=[vars.project])),
            self.board.updates(vars.board_generation))
        self.assertTrue(vars.generation > vars.board_generation)

        self.assertEqual('first'         , vars.project.title)
        self.assertEqual(42              , vars.project.order)
        self.assertEqual('Do First thing', vars.project.description)
        self.assertEqual('j1m'           , vars.project.assigned)

    def test_update_all(self):
        self.board.new_project('first', 42, 'Do First thing')
        vars = Vars()
        self.assertEqual(
            dict(generation=vars.board_generation,
                 tasks=dict(adds=[vars.project])),
            self.board.updates(self.board_generation))

        data = dict(
            title='a project',
            description='It will be great',
            size=2,
            blocked="It's in the way",
            assigned='j1m',
            )

        self.board.update_task(vars.project.id, **data)
        self.assertEqual(
            dict(generation=vars.generation,
                 tasks=dict(adds=[vars.project])),
            self.board.updates(vars.board_generation))
        self.assertTrue(vars.generation > vars.board_generation)

    def test_update_invalid(self):
        self.board.new_project('first', 42, 'Do First thing')
        vars = Vars()
        self.assertEqual(
            dict(generation=vars.board_generation,
                 tasks=dict(adds=[vars.project])),
            self.board.updates(self.board_generation))

        with self.assertRaises(Exception):
            self.board.update_task(vars.project.id, order='42')

        with self.assertRaises(Exception):
            self.board.update_task(vars.project.id, foo=1)

        self.assertEqual(self.board.generation, vars.board_generation)

    def _state_id(self, title):
        return [state.id for state in self.board.states
                if state.title == title][0]

    @mock.patch('twotieredkanban.board.now')
    def test_move(self, now):
        now.return_value = '2017-06-08T10:02:00.004'
        self.board.new_project('first' , 42, 'Do First thing')
        vars = Vars()
        self.assertEqual(dict(generation=vars.gen1, tasks=dict(adds=[vars.t1])),
                         self.board.updates(self.board_generation))

        self.board.new_project('second', 43, 'Do Next thing')
        self.assertEqual(dict(generation=vars.gen2, tasks=dict(adds=[vars.t2])),
                         self.board.updates(vars.gen1))
        self.assertTrue(vars.gen2 > vars.gen1)

        self.board.new_project('third', 44, 'Do 3rd thing')
        self.assertEqual(dict(generation=vars.gen3, tasks=dict(adds=[vars.t3])),
                         self.board.updates(vars.gen2))
        self.assertTrue(vars.gen3 > vars.gen2)

        self.assertEqual(
            ({'start': '2017-06-08T10:02:00.004', 'state': 'Backlog'},),
            vars.t1.history)
        self.assertEqual(
            ({'start': '2017-06-08T10:02:00.004', 'state': 'Backlog'},),
            vars.t2.history)
        self.assertEqual(
            ({'start': '2017-06-08T10:02:00.004', 'state': 'Backlog'},),
            vars.t3.history)

        # Make second project a task
        now.return_value = '2017-06-08T10:02:01.004'
        self.board.move(vars.t2.id, vars.t1.id, self._state_id('Doing'), 1,
                        user_id='test')
        self.assertEqual(dict(generation=vars.gen4, tasks=dict(adds=[vars.t2])),
                         self.board.updates(vars.gen3))
        self.assertTrue(vars.gen4 > vars.gen3)

        self.assertEqual(vars.t1, vars.t2.parent)
        self.assertEqual('Doing', vars.t2.state.title)
        self.assertEqual(1, vars.t2.order)

        self.assertEqual(
            ({
                'start': "2017-06-08T10:02:00.004",
                'end': "2017-06-08T10:02:01.004",
                'state': 'Backlog'
                },
             {
                 'start': "2017-06-08T10:02:01.004",
                 'state': "Doing",
                 'assigned': 'test'
                 },
             ),
            vars.t2.history)

        # Move first project to new state
        now.return_value = '2017-06-08T10:02:02.004'
        self.board.move(vars.t1.id, None, self._state_id('Development'), 2,
                        user_id='test')
        self.assertEqual(dict(generation=vars.gen5,
                              tasks=dict(adds=[vars.t1, vars.t2])),
                         self.board.updates(vars.gen4))
        self.assertTrue(vars.gen5 > vars.gen4)

        self.assertEqual(None, vars.t1.parent)
        self.assertEqual('Development', vars.t1.state.title)
        self.assertEqual(2, vars.t1.order)
        self.assertEqual((
              {
                'start': "2017-06-08T10:02:00.004",
                'end': "2017-06-08T10:02:02.004",
                'state': 'Backlog'
              },
              {
                'start': "2017-06-08T10:02:02.004",
                'state': "Development",
                'working': True
              },
            ), vars.t1.history)
        self.assertEqual((
              {
                'start': "2017-06-08T10:02:00.004",
                'end': "2017-06-08T10:02:01.004",
                'state': 'Backlog'

              },
              {
                'start': "2017-06-08T10:02:01.004",
                'end': "2017-06-08T10:02:02.004",
                'state': "Doing",
                'assigned': 'test'
              },
              {
                'start': "2017-06-08T10:02:02.004",
                'state': "Doing",
                'working': True,
                'assigned': 'test'
              },
            ), vars.t2.history)

        # Change order of first
        self.board.move(vars.t1.id, None, self._state_id('Development'), 3,
                        user_id='test')
        self.assertEqual(dict(generation=vars.gen6, tasks=dict(adds=[vars.t1])),
                         self.board.updates(vars.gen5))
        self.assertTrue(vars.gen6 > vars.gen5)

        self.assertEqual(None, vars.t1.parent)
        self.assertEqual('Development', vars.t1.state.title)
        self.assertEqual(3, vars.t1.order)

        ##################################################################
        # Same as prev
        self.assertEqual((
              {
                'start': "2017-06-08T10:02:00.004",
                'end': "2017-06-08T10:02:02.004",
                'state': 'Backlog'
              },
              {
                'start': "2017-06-08T10:02:02.004",
                'state': "Development",
                'working': True
              },
            ), vars.t1.history)
        self.assertEqual((
              {
                'start': "2017-06-08T10:02:00.004",
                'end': "2017-06-08T10:02:01.004",
                'state': 'Backlog'
              },
              {
                'start': "2017-06-08T10:02:01.004",
                'end': "2017-06-08T10:02:02.004",
                'state': "Doing",
                'assigned': 'test'
              },
              {
                'start': "2017-06-08T10:02:02.004",
                'state': "Doing",
                'working': True,
                'assigned': 'test'
              },
            ), vars.t2.history)
        #
        ##################################################################

        # Now, some invalid moves:

        # Can't move to task:
        with self.assertRaises(Exception):
            self.board.move(vars.t3.id, vars.t2.id, self._state_id('Doing'), 4,
                        user_id='test')

        # Can't make non-empty feature a task:
        with self.assertRaises(Exception):
            self.board.move(vars.t1.id, vars.t3.id, self._state_id('Doing'), 4,
                        user_id='test')

        # Can't move to feature with task state:
        with self.assertRaises(Exception):
            self.board.move(vars.t3.id, None, self._state_id('Doing'), 4,
                        user_id='test')

        # Can't move to project with to-level state:
        with self.assertRaises(Exception):
            self.board.move(vars.t3.id, vars.t1.id, self._state_id('Backlog'),
                            4)

        # finish t2
        now.return_value = '2017-06-08T10:02:03.004'
        self.board.move(vars.t2.id, vars.t1.id, self._state_id('Done'), 1,
                        user_id='test')
        self.assertEqual((
              {
                'start': "2017-06-08T10:02:00.004",
                'end':   "2017-06-08T10:02:01.004",
                'state': 'Backlog'
              },
              {
                'start': "2017-06-08T10:02:01.004",
                'end':   "2017-06-08T10:02:02.004",
                'state': "Doing",
                'assigned': 'test'
              },
              {
                'start': "2017-06-08T10:02:02.004",
                'end':   "2017-06-08T10:02:03.004",
                'state': "Doing",
                'working': True,
                'assigned': 'test'
              },
              {
                'start': "2017-06-08T10:02:03.004",
                'state': "Done",
                'complete': True,
                'assigned': 'test'
              },
            ), vars.t2.history)

        # We can promote a task to a project:
        now.return_value = '2017-06-08T10:02:04.004'
        self.board.move(vars.t2.id, None, self._state_id('Backlog'), 5,
                        user_id='test')
        self.assertEqual(dict(generation=vars.gen7, tasks=dict(adds=[vars.t2])),
                         self.board.updates(vars.gen6))
        self.assertTrue(vars.gen7 > vars.gen6)

        self.assertEqual(None, vars.t2.parent)
        self.assertEqual('Backlog', vars.t2.state.title)
        self.assertEqual(5, vars.t2.order)
        self.assertEqual((
              {
                'start': "2017-06-08T10:02:00.004",
                'end':   "2017-06-08T10:02:01.004",
                'state': 'Backlog'
              },
              {
                'start': "2017-06-08T10:02:01.004",
                'end':   "2017-06-08T10:02:02.004",
                'state': "Doing",
                'assigned': 'test'
              },
              {
                'start': "2017-06-08T10:02:02.004",
                'end':   "2017-06-08T10:02:03.004",
                'state': "Doing",
                'working': True,
                'assigned': 'test'
              },
              {
                'start': "2017-06-08T10:02:03.004",
                'end':   "2017-06-08T10:02:04.004",
                'state': "Done",
                'complete': True,
                'assigned': 'test'
              },
              {
                'start': "2017-06-08T10:02:04.004",
                'state': "Backlog",
              },
            ), vars.t2.history)

    def test_move_into_project_wo_changing_state_or_order(self):
        self.board.new_project('first' , 42, 'Do First thing')
        vars = Vars()
        self.assertEqual(dict(generation=vars.gen1, tasks=dict(adds=[vars.t1])),
                         self.board.updates(self.board_generation))

        self.board.new_project('second', 43, 'Do Next thing')
        self.assertEqual(dict(generation=vars.gen2, tasks=dict(adds=[vars.t2])),
                         self.board.updates(vars.gen1))
        self.assertTrue(vars.gen2 > vars.gen1)

        self.board.new_project('third', 44, 'Do 3rd thing')
        self.assertEqual(dict(generation=vars.gen3, tasks=dict(adds=[vars.t3])),
                         self.board.updates(vars.gen2))
        self.assertTrue(vars.gen3 > vars.gen2)

        # Make second project a task
        self.board.move(vars.t2.id, vars.t1.id,
                        user_id='test')
        self.assertEqual(vars.t1.id, vars.t2.parent.id)
        self.assertEqual('ready', vars.t2.state.id)
        self.assertEqual(43, vars.t2.order)

        # Move t2 to an actual state:
        self.board.move(vars.t2.id, vars.t1.id, self._state_id('Doing'),
                        user_id='test')

        # Move t2 to t3, and state and order are preserved:
        self.board.move(vars.t2.id, vars.t3.id,
                        user_id='test')
        self.assertEqual(vars.t3.id, vars.t2.parent.id)
        self.assertEqual(self._state_id('Doing'), vars.t2.state.id)
        self.assertEqual(43, vars.t2.order)

        # Move t1 to new state then move to p3 and state is lost:
        self.board.move(vars.t1.id, state_id=self._state_id('Development'),
                        user_id='test')
        self.board.move(vars.t1.id, vars.t3.id,
                        user_id='test')
        self.assertEqual(vars.t3.id, vars.t1.parent.id)
        self.assertEqual('ready', vars.t1.state.id)
        self.assertEqual(42, vars.t1.order)

    def test_sanitize(self):
        self.board.new_project('first', 42, sample_description)
        vars = Vars()
        self.assertEqual(
            dict(generation=vars.board_generation,
                 tasks=dict(adds=[vars.project])),
            self.board.updates(self.board_generation))

        self.assertEqual(sample_description_cleaned,
                         vars.project.description)

        self.board.new_task(vars.project.id, 'a sub', 43, sample_description)
        self.assertEqual(dict(generation=vars.generation,
                              tasks=dict(adds=[vars.task])),
                         self.board.updates(vars.board_generation))
        self.assertTrue(vars.generation > vars.board_generation)

        self.assertEqual(sample_description_cleaned,
                         vars.task.description)

        self.board.update_task(vars.task.id, description='')
        self.assertEqual('', vars.task.description)
        self.board.update_task(vars.task.id,
                               description=sample_description)
        self.assertEqual(sample_description_cleaned,
                         vars.task.description)

    @mock.patch('twotieredkanban.board.now')
    def test_archive_and_restore(self, now):
        now.return_value = '2017-06-08T10:02:00.004'
        board, updates = self.board, self.updates
        vars = Vars()

        # Make some features:
        board.new_project('p1' , 42, '')
        self.assertEqual([vars.p1], updates()['tasks']['adds'])
        board.new_task(vars.p1.id, 't1', 1)
        self.assertEqual([vars.t1], updates()['tasks']['adds'])
        board.new_task(vars.p1.id, 't2', 1)
        self.assertEqual([vars.t2], updates()['tasks']['adds'])

        # Decoys to make sure we don't work on too much:
        board.new_project('p2' , 43, '')
        self.assertEqual([vars.p2], updates()['tasks']['adds'])
        board.new_task(vars.p2.id, 't3', 1)
        self.assertEqual([vars.t3], updates()['tasks']['adds'])

        # Move p1 to a state other than backlog
        board.move(vars.p1.id, state_id='Development')
        updates() # reset generation

        # Now, archive p1:
        self.assertEqual(0, board.archive_count)
        now.return_value = '2017-06-08T10:02:01.004'
        board.archive_feature(vars.p1.id)
        self.assertEqual(
            dict(board=board, site=board.site,
                 tasks=dict(removals=vars.removals)),
            updates())
        self.assertEqual(1, board.archive_count)

        # If we asked for all updates, we'd see the expected data:
        self.assertEqual(
            dict(board=board, site=board.site,
                 states=vars.states,
                 tasks=dict(adds=vars.remaining),
                 generation=vars.generation,
                 zoid=vars.zoid,
                 ),
            board.updates(0))
        self.assertEqual(['p2', 't3'], sorted(t.title for t in vars.remaining))

        # p1, which is now archived, has it's tasks in it's tasks attr:
        self.assertEqual([vars.t1, vars.t2],
                         sorted(vars.p1.tasks, key=lambda t: t.title))

        # History has the archival event:
        self.assertEqual(dict(start='2017-06-08T10:02:01.004',
                              state="Development", working=True, archived=True,
                              ), vars.p1.history[-1])
        self.assertEqual(dict(start='2017-06-08T10:02:00.004',
                              end  ='2017-06-08T10:02:01.004',
                              state="Development", working=True,
                              ), vars.p1.history[-2])

        # OK, now let's retore:
        now.return_value = '2017-06-08T10:02:02.004'
        board.restore_feature(vars.p1.id)
        self.assertEqual(
            dict(board=board, site=board.site,
                 tasks=dict(adds=vars.restored)),
            updates())
        self.assertEqual(0, board.archive_count)
        self.assertEqual([vars.p1, vars.t1, vars.t2],
                         sorted(vars.restored, key=lambda t: t.title))

        # If we asked for all updates, we'd see the expected data:
        self.assertEqual(
            dict(board=board, site=board.site,
                 states=vars.states,
                 tasks=dict(adds=vars.all),
                 generation=vars.generationr,
                 zoid=vars.zoid,
                 ),
            board.updates(0))
        self.assertEqual([vars.p1, vars.p2, vars.t1, vars.t2, vars.t3],
                         sorted(vars.all, key=lambda t: t.title))

        # History has the archival event:
        self.assertEqual(dict(start='2017-06-08T10:02:02.004',
                              state="Development", working=True
                              ), vars.p1.history[-1])
        self.assertEqual(dict(start='2017-06-08T10:02:01.004',
                              end  ='2017-06-08T10:02:02.004',
                              state="Development", working=True, archived=True,
                              ), vars.p1.history[-2])

    @mock.patch('twotieredkanban.board.now')
    def test_archive_and_restore_empty_feature(self, now):
        now.return_value = '2017-06-08T10:02:00.004'
        board, updates = self.board, self.updates
        vars = Vars()

        # Make an empty feature:
        board.new_project('p1' , 42, '')
        self.assertEqual([vars.p1], updates()['tasks']['adds'])

        # Now, archive p1:
        self.assertEqual(0, board.archive_count)
        now.return_value = '2017-06-08T10:02:01.004'
        board.archive_feature(vars.p1.id)
        self.assertEqual(
            dict(board=board, site=board.site,
                 tasks=dict(removals=[vars.p1.id])),
            updates())
        self.assertEqual(1, board.archive_count)

        # If we asked for all updates, we'd see the expected data:
        self.assertEqual(
            dict(board=board, site=board.site,
                 states=vars.states,
                 tasks={},
                 generation=vars.generation,
                 zoid=vars.zoid,
                 ),
            board.updates(0))

        # p1, which is now archived, has it's tasks in it's tasks attr:
        self.assertEqual([], vars.p1.tasks)

        # History has the archival event:
        self.assertEqual(dict(start='2017-06-08T10:02:01.004',
                              state="Backlog", archived=True,
                              ), vars.p1.history[-1])
        self.assertEqual(dict(start='2017-06-08T10:02:00.004',
                              end  ='2017-06-08T10:02:01.004',
                              state="Backlog",
                              ), vars.p1.history[-2])

        # OK, now let's retore:
        now.return_value = '2017-06-08T10:02:02.004'
        board.restore_feature(vars.p1.id)
        self.assertEqual(
            dict(board=board, site=board.site,
                 tasks=dict(adds=[vars.p1])),
            updates())
        self.assertEqual(0, board.archive_count)

        # If we asked for all updates, we'd see the expected data:
        self.assertEqual(
            dict(board=board, site=board.site,
                 states=vars.states,
                 tasks=dict(adds=[vars.p1]),
                 generation=vars.generationr,
                 zoid=vars.zoid,
                 ),
            board.updates(0))

        # History has the archival event:
        self.assertEqual(dict(start='2017-06-08T10:02:02.004',
                              state="Backlog",
                              ), vars.p1.history[-1])
        self.assertEqual(dict(start='2017-06-08T10:02:01.004',
                              end  ='2017-06-08T10:02:02.004',
                              state="Backlog", archived=True,
                              ), vars.p1.history[-2])

    def test_remove_task(self):
        self.board.new_project("Feature", 0)
        [fid] = [t.id for t in self.updates()['tasks']['adds']]
        self.board.new_task(fid, "t1", 0)
        self.board.new_task(fid, "t2", 0)
        t1id, t2id = [t.id for t in self.updates()['tasks']['adds']]
        self.board.remove(t1id)
        self.assertEqual([t1id], self.updates()['tasks']['removals'])
        self.assertEqual(len(self.board.tasks), 2)

    def test_remove_feature(self):
        self.board.new_project("Feature", 0)
        [fid] = [t.id for t in self.updates()['tasks']['adds']]
        self.board.new_task(fid, "t1", 0)
        self.board.new_task(fid, "t2", 0)
        t1id, t2id = [t.id for t in self.updates()['tasks']['adds']]
        self.board.remove(fid)
        self.assertEqual(
            set([fid, t1id, t2id]),
            set(self.updates()['tasks']['removals']))
        self.assertEqual(len(self.board.tasks), 0)

    def test_remove_task_then_feature(self):
        self.board.new_project("Feature", 0)
        [fid] = [t.id for t in self.updates()['tasks']['adds']]
        self.board.new_task(fid, "t1", 0)
        self.board.new_task(fid, "t2", 0)
        t1id, t2id = [t.id for t in self.updates()['tasks']['adds']]
        self.board.remove(t1id)
        self.board.remove(fid)
        self.assertEqual(
            set([fid, t1id, t2id]),
            set(self.updates()['tasks']['removals']))
        self.assertEqual(len(self.board.tasks), 0)


sample_description = """
<h1>Heading large</h1>
<h2>Heading medium</h2>
<h3>Heading small</h3>
<p><strong>Bold</strong> <em>italic</em>
   <del>strikethrough</del> <code>code</code> <ins>underline</ins></p>
<ul>
  <li>this</li>
  <li>that</li>
</ul>
<ol>
  <li>first</li>
  <li>second</li>
</ol>
<blockquote>Blockquote</blockquote>
<p><a href="http://valuenator.com">link</a></p>
<pre><code>import this</code></pre>
<p>See http://valuenator.com.</p>
<script>evil()</script>
<p><br></p>
"""

sample_description_cleaned = """
<h1>Heading large</h1>
<h2>Heading medium</h2>
<h3>Heading small</h3>
<p><strong>Bold</strong> <em>italic</em>
   <del>strikethrough</del> <code>code</code> <ins>underline</ins></p>
<ul>
  <li>this</li>
  <li>that</li>
</ul>
<ol>
  <li>first</li>
  <li>second</li>
</ol>
<blockquote>Blockquote</blockquote>
<p><a href="http://valuenator.com" rel="nofollow">link</a></p>
<pre><code>import this</code></pre>
<p>See <a href="http://valuenator.com" rel="nofollow">http://valuenator.com</a>.</p>
&lt;script&gt;evil()&lt;/script&gt;
<p><br></p>
"""
