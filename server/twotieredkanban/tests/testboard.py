import json
import mock
import unittest
import ZODB
from ZODB.utils import u64

from ..apiutil import Encoder
from .var import Var, Vars

def reduce(data):
    return json.loads(json.dumps(data, cls=Encoder))

class BoardTests(unittest.TestCase):

    maxDiff = None


    def setUp(self):
        from ..site import Site
        self.conn = ZODB.connection(None)
        self.conn.root.site = self.site = Site()
        self.site.add_board('dev', 'Development', 'Development projects')
        self.board = self.site.boards['dev']
        self.board_generation = self.board.generation
        self.vars = Vars()
        self.conn.transaction_manager.commit()

    def test_initial_data(self):
        self.assertEqual(
            dict(generation=self.board_generation,
                 states=dict(adds=Var(self, 'states')),
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
            reduce(self.states))

        self.assertEqual(len(set(state.id for state in self.states)),
                         len(self.states))

    def test_json(self):
        self.assertEqual(
            dict(name='dev', title='Development',
                 description='Development projects'),
            self.board.json_reduce())

    def test_update(self):
        self.board.update('do', 'Do things', 'Get things done')
        self.assertEqual(
            dict(name='do', title='Do things',
                 description='Get things done'),
            self.board.json_reduce())

        self.assertEqual(
            dict(generation=self.vars.generation,
                 board=self.board, site=self.site),
            self.board.updates(self.board_generation))
        self.assertTrue(self.vars.generation > self.board_generation)

    def test_new_project(self):
        self.board.new_project('first', 42, 'Do First thing')
        self.assertEqual(
            dict(generation=self.vars.generation,
                 tasks=dict(adds=[self.vars.project])),
            self.board.updates(self.board_generation))
        self.assertEqual('first'         , self.vars.project.title)
        self.assertEqual(42              , self.vars.project.order)
        self.assertEqual('Do First thing', self.vars.project.description)

        self.assertTrue(self.vars.generation > self.board_generation)

    def test_new_task(self):
        self.board.new_project('first', 42, 'Do First thing')
        self.assertEqual(
            dict(generation=self.vars.board_generation,
                 tasks=dict(adds=[self.vars.project])),
            self.board.updates(self.board_generation))

        self.board.new_task(
            self.vars.project.id, 'a sub', 43, 'A First subtask')
        self.assertEqual(
            dict(generation=self.vars.generation,
                 tasks=dict(adds=[self.vars.task])),
            self.board.updates(self.vars.board_generation))
        self.assertTrue(self.vars.generation > self.vars.board_generation)

        self.assertEqual('a sub'          , self.vars.task.title)
        self.assertEqual(43               , self.vars.task.order)
        self.assertEqual('A First subtask', self.vars.task.description)
        self.assertEqual(self.vars.project, self.vars.task.parent)


    def test_update_some(self):
        self.board.new_project('first', 42, 'Do First thing')
        self.assertEqual(
            dict(generation=self.vars.board_generation,
                 tasks=dict(adds=[self.vars.project])),
            self.board.updates(self.board_generation))

        self.board.update_task(self.vars.project.id, assigned='j1m')
        self.assertEqual(
            dict(generation=self.vars.generation,
                 tasks=dict(adds=[self.vars.project])),
            self.board.updates(self.vars.board_generation))
        self.assertTrue(self.vars.generation > self.vars.board_generation)

        self.assertEqual('first'         , self.vars.project.title)
        self.assertEqual(42              , self.vars.project.order)
        self.assertEqual('Do First thing', self.vars.project.description)
        self.assertEqual('j1m'           , self.vars.project.assigned)

    def test_update_all(self):
        self.board.new_project('first', 42, 'Do First thing')
        self.assertEqual(
            dict(generation=self.vars.board_generation,
                 tasks=dict(adds=[self.vars.project])),
            self.board.updates(self.board_generation))

        data = dict(
            title='a project',
            description='It will be great',
            size=2,
            blocked="It's in the way",
            assigned='j1m',
            )

        self.board.update_task(self.vars.project.id, **data)
        self.assertEqual(
            dict(generation=self.vars.generation,
                 tasks=dict(adds=[self.vars.project])),
            self.board.updates(self.vars.board_generation))
        self.assertTrue(self.vars.generation > self.vars.board_generation)

    def test_update_invalid(self):
        self.board.new_project('first', 42, 'Do First thing')
        self.assertEqual(
            dict(generation=self.vars.board_generation,
                 tasks=dict(adds=[self.vars.project])),
            self.board.updates(self.board_generation))

        with self.assertRaises(Exception):
            self.board.update_task(self.vars.project.id, order='42')

        with self.assertRaises(Exception):
            self.board.update_task(self.vars.project.id, foo=1)

        self.assertEqual(self.board.generation, self.vars.board_generation)

    def _state_id(self, title):
        return [state.id for state in self.board.states
                if state.title == title][0]

    @mock.patch('twotieredkanban.board.now')
    def test_move(self, now):
        now.return_value = '2017-06-08T10:02:00.004'
        self.board.new_project('first' , 42, 'Do First thing')
        vars = self.vars
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
        self.board.move(vars.t2.id, vars.t1.id, self._state_id('Doing'), 1)
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
                 'state': "Doing"
                 },
             ),
            vars.t2.history)

        # Move first project to new state
        now.return_value = '2017-06-08T10:02:02.004'
        self.board.move(vars.t1.id, None, self._state_id('Development'), 2)
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
                'state': "Doing"
              },
              {
                'start': "2017-06-08T10:02:02.004",
                'state': "Doing",
                'working': True
              },
            ), vars.t2.history)

        # Change order of first
        self.board.move(vars.t1.id, None, self._state_id('Development'), 3)
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
                'state': "Doing"
              },
              {
                'start': "2017-06-08T10:02:02.004",
                'state': "Doing",
                'working': True
              },
            ), vars.t2.history)
        #
        ##################################################################

        # Now, some invalid moves:

        # Can't move to task:
        with self.assertRaises(Exception):
            self.board.move(vars.t3.id, vars.t2.id, self._state_id('Doing'), 4)

        # Can't make non-empty feature a task:
        with self.assertRaises(Exception):
            self.board.move(vars.t1.id, vars.t3.id, self._state_id('Doing'), 4)

        # Can't move to feature with task state:
        with self.assertRaises(Exception):
            self.board.move(vars.t3.id, None, self._state_id('Doing'), 4)

        # Can't move to project with to-level state:
        with self.assertRaises(Exception):
            self.board.move(vars.t3.id, vars.t1.id, self._state_id('Backlog'),
                            4)

        # finish t2
        now.return_value = '2017-06-08T10:02:03.004'
        self.board.move(vars.t2.id, vars.t1.id, self._state_id('Done'), 1)
        self.assertEqual((
              {
                'start': "2017-06-08T10:02:00.004",
                'end':   "2017-06-08T10:02:01.004",
                'state': 'Backlog'
              },
              {
                'start': "2017-06-08T10:02:01.004",
                'end':   "2017-06-08T10:02:02.004",
                'state': "Doing"
              },
              {
                'start': "2017-06-08T10:02:02.004",
                'end':   "2017-06-08T10:02:03.004",
                'state': "Doing",
                'working': True
              },
              {
                'start': "2017-06-08T10:02:03.004",
                'state': "Done",
                'complete': True
              },
            ), vars.t2.history)

        # We can promote a task to a project:
        now.return_value = '2017-06-08T10:02:04.004'
        self.board.move(vars.t2.id, None, self._state_id('Backlog'), 5)
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
                'state': "Doing"
              },
              {
                'start': "2017-06-08T10:02:02.004",
                'end':   "2017-06-08T10:02:03.004",
                'state': "Doing",
                'working': True
              },
              {
                'start': "2017-06-08T10:02:03.004",
                'end':   "2017-06-08T10:02:04.004",
                'state': "Done",
                'complete': True
              },
              {
                'start': "2017-06-08T10:02:04.004",
                'state': "Backlog",
              },
            ), vars.t2.history)

    def test_move_into_project_wo_changing_state_or_order(self):
        self.board.new_project('first' , 42, 'Do First thing')
        vars = self.vars
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
        self.board.move(vars.t2.id, vars.t1.id)
        self.assertEqual(vars.t1.id, vars.t2.parent.id)
        self.assertEqual('ready', vars.t2.state.id)
        self.assertEqual(43, vars.t2.order)

        # Move t2 to an actual state:
        self.board.move(vars.t2.id, vars.t1.id, self._state_id('Doing'))

        # Move t2 to t3, and state and order are preserved:
        self.board.move(vars.t2.id, vars.t3.id)
        self.assertEqual(vars.t3.id, vars.t2.parent.id)
        self.assertEqual(self._state_id('Doing'), vars.t2.state.id)
        self.assertEqual(43, vars.t2.order)

        # Move t1 to new state then move to p3 and state is lost:
        self.board.move(vars.t1.id, state_id=self._state_id('Development'))
        self.board.move(vars.t1.id, vars.t3.id)
        self.assertEqual(vars.t3.id, vars.t1.parent.id)
        self.assertEqual('ready', vars.t1.state.id)
        self.assertEqual(42, vars.t1.order)
