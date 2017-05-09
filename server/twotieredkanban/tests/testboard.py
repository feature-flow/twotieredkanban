import json
import mock
import unittest

from ..apiboard import Encoder
from .var import Var, Vars

def reduce(data):
    return json.loads(json.dumps(data, cls=Encoder))

class BoardTests(unittest.TestCase):

    def setUp(self):
        from ..site import Site
        self.site = Site('user@example.com')
        self.site.add_board('dev', 'Development', 'Development projects')
        self.board = self.site.boards['dev']
        self.board_generation = self.board.generation
        self.vars = Vars()

    def test_initial_data(self):
        self.assertEqual(
            dict(generation=self.board_generation,
                 states=dict(adds=Var(self, 'states')),
                 board=self.board,
                 ),
            self.board.updates(0))
        ids = set()
        dev = Var()
        def check_dev(id):
            if id != dev.v:
                raise AssertionError('bad parent')

        self.assertEqual(
            [{'complete': False, 'id': Var(f=ids.add), 'order': 0,
              'parent': None, 'title': 'Backlog', 'working': False},
             {'complete': False, 'id': Var(f=ids.add), 'order': 1048576,
              'parent': None, 'title': 'Ready', 'working': False},
             {'complete': False, 'id': dev, 'order': 2097152,
              'parent': None, 'title': 'Development', 'working': False},
             {'complete': False, 'id': Var(f=ids.add), 'order': 2097152,
              'parent': Var(f=check_dev), 'title': 'Ready',
              'working': False},
             {'complete': False, 'id': Var(f=ids.add), 'order': 2097152,
              'parent': Var(f=check_dev), 'title': 'Doing',
              'working': True},
             {'complete': False, 'id': Var(f=ids.add), 'order': 2097152,
              'parent': Var(f=check_dev), 'title': 'Needs review',
              'working': False},
             {'complete': False, 'id': Var(f=ids.add), 'order': 2097152,
              'parent': Var(f=check_dev), 'title': 'Review',
              'working': True},
             {'complete': True, 'id': Var(f=ids.add), 'order': 2097152,
              'parent': Var(f=check_dev), 'title': 'Done',
              'working': False},
             {'complete': False, 'id': Var(f=ids.add), 'order': 3145728,
              'parent': None, 'title': 'Acceptance',
              'working': False},
             {'complete': False, 'id': Var(f=ids.add), 'order': 4194304,
              'parent': None, 'title': 'Deploying',
              'working': False},
             {'complete': False, 'id': Var(f=ids.add), 'order': 5242880,
              'parent': None, 'title': 'Deployed', 'working': False}],
            reduce(self.states))

        ids.add(dev.v)
        self.assertEqual(len(self.states),
                         len([i for i in ids
                              if isinstance(i, str) and len(i) == 32]))

    def test_json(self):
        self.assertEqual(
            dict(site=self.site, name='dev', title='Development',
                 description='Development projects'),
            self.board.json_reduce())

    def test_update(self):
        self.board.update('do', 'Do things', 'Get things done')
        self.assertEqual(
            dict(site=self.site, name='do', title='Do things',
                 description='Get things done'),
            self.board.json_reduce())

        self.assertEqual(
            dict(generation=self.vars.generation,
                 board=self.board),
            self.board.updates(self.board_generation))
        self.assertTrue(self.vars.generation > self.board_generation)

    def test_new_release(self):
        self.board.new_release('first', 42, 'Do First thing')
        self.assertEqual(
            dict(generation=self.vars.generation,
                 tasks=dict(adds=[self.vars.release])),
            self.board.updates(self.board_generation))
        self.assertEqual('first'         , self.vars.release.title)
        self.assertEqual(42              , self.vars.release.order)
        self.assertEqual('Do First thing', self.vars.release.description)

        self.assertTrue(self.vars.generation > self.board_generation)

    def test_new_task(self):
        self.board.new_release('first', 42, 'Do First thing')
        self.assertEqual(
            dict(generation=self.vars.board_generation,
                 tasks=dict(adds=[self.vars.release])),
            self.board.updates(self.board_generation))

        self.board.new_task(
            self.vars.release.id, 'a sub', 43, 'A First subtask')
        self.assertEqual(
            dict(generation=self.vars.generation,
                 tasks=dict(adds=[self.vars.task])),
            self.board.updates(self.vars.board_generation))
        self.assertTrue(self.vars.generation > self.vars.board_generation)

        self.assertEqual('a sub'          , self.vars.task.title)
        self.assertEqual(43               , self.vars.task.order)
        self.assertEqual('A First subtask', self.vars.task.description)
        self.assertEqual(self.vars.release, self.vars.task.parent)


    def test_update_some(self):
        self.board.new_release('first', 42, 'Do First thing')
        self.assertEqual(
            dict(generation=self.vars.board_generation,
                 tasks=dict(adds=[self.vars.release])),
            self.board.updates(self.board_generation))

        self.board.update_task(self.vars.release.id, assigned='j1m')
        self.assertEqual(
            dict(generation=self.vars.generation,
                 tasks=dict(adds=[self.vars.release])),
            self.board.updates(self.vars.board_generation))
        self.assertTrue(self.vars.generation > self.vars.board_generation)

        self.assertEqual('first'         , self.vars.release.title)
        self.assertEqual(42              , self.vars.release.order)
        self.assertEqual('Do First thing', self.vars.release.description)
        self.assertEqual('j1m'           , self.vars.release.assigned)

    def test_update_all(self):
        self.board.new_release('first', 42, 'Do First thing')
        self.assertEqual(
            dict(generation=self.vars.board_generation,
                 tasks=dict(adds=[self.vars.release])),
            self.board.updates(self.board_generation))

        data = dict(
            title='a release',
            description='It will be great',
            size=2,
            blocked="It's in the way",
            assigned='j1m',
            )

        self.board.update_task(self.vars.release.id, **data)
        self.assertEqual(
            dict(generation=self.vars.generation,
                 tasks=dict(adds=[self.vars.release])),
            self.board.updates(self.vars.board_generation))
        self.assertTrue(self.vars.generation > self.vars.board_generation)

    def test_update_invalid(self):
        self.board.new_release('first', 42, 'Do First thing')
        self.assertEqual(
            dict(generation=self.vars.board_generation,
                 tasks=dict(adds=[self.vars.release])),
            self.board.updates(self.board_generation))

        with self.assertRaises(Exception):
            self.board.update_task(self.vars.release.id, order='42')

        with self.assertRaises(Exception):
            self.board.update_task(self.vars.release.id, foo=1)

        self.assertEqual(self.board.generation, self.vars.board_generation)

    def _state_id(self, title):
        return [state.id for state in self.board.states
                if state.title == title][0]

    def test_move(self):
        self.board.new_release('first' , 42, 'Do First thing')
        vars = self.vars
        self.assertEqual(dict(generation=vars.gen1, tasks=dict(adds=[vars.t1])),
                         self.board.updates(self.board_generation))

        self.board.new_release('second', 43, 'Do Next thing')
        self.assertEqual(dict(generation=vars.gen2, tasks=dict(adds=[vars.t2])),
                         self.board.updates(vars.gen1))
        self.assertTrue(vars.gen2 > vars.gen1)

        self.board.new_release('third', 44, 'Do 3rd thing')
        self.assertEqual(dict(generation=vars.gen3, tasks=dict(adds=[vars.t3])),
                         self.board.updates(vars.gen2))
        self.assertTrue(vars.gen3 > vars.gen2)

        # Make second task a subtask
        self.board.move(vars.t2.id, vars.t1.id, self._state_id('Doing'), 1)
        self.assertEqual(dict(generation=vars.gen4, tasks=dict(adds=[vars.t2])),
                         self.board.updates(vars.gen3))
        self.assertTrue(vars.gen4 > vars.gen3)

        self.assertEqual(vars.t1, vars.t2.parent)
        self.assertEqual('Doing', vars.t2.state.title)
        self.assertEqual(1, vars.t2.order)

        # Move first task to new state
        self.board.move(vars.t1.id, None, self._state_id('Development'), 2)
        self.assertEqual(dict(generation=vars.gen5, tasks=dict(adds=[vars.t1])),
                         self.board.updates(vars.gen4))
        self.assertTrue(vars.gen5 > vars.gen4)

        self.assertEqual(None, vars.t1.parent)
        self.assertEqual('Development', vars.t1.state.title)
        self.assertEqual(2, vars.t1.order)

        # Change order of first
        self.board.move(vars.t1.id, None, self._state_id('Development'), 3)
        self.assertEqual(dict(generation=vars.gen6, tasks=dict(adds=[vars.t1])),
                         self.board.updates(vars.gen5))
        self.assertTrue(vars.gen6 > vars.gen5)

        self.assertEqual(None, vars.t1.parent)
        self.assertEqual('Development', vars.t1.state.title)
        self.assertEqual(3, vars.t1.order)

        # Now, some invalid moves:

        # Can't move to subtask:
        with self.assertRaises(Exception):
            self.board.move(vars.t3.id, vars.t2.id, self._state_id('Doing'), 4)

        # Can't make non-empty feature a subtask:
        with self.assertRaises(Exception):
            self.board.move(vars.t1.id, vars.t3.id, self._state_id('Doing'), 4)

        # Can't move to feature with subtask state:
        with self.assertRaises(Exception):
            self.board.move(vars.t3.id, None, self._state_id('Doing'), 4)

        # Can't move to task with to-level state:
        with self.assertRaises(Exception):
            self.board.move(vars.t3.id, vars.t1.id, self._state_id('Backlog'),
                            4)

        # We can promote a task to a feature:
        self.board.move(vars.t2.id, None, self._state_id('Backlog'), 5)
        self.assertEqual(dict(generation=vars.gen7, tasks=dict(adds=[vars.t2])),
                         self.board.updates(vars.gen6))
        self.assertTrue(vars.gen7 > vars.gen6)

        self.assertEqual(None, vars.t2.parent)
        self.assertEqual('Backlog', vars.t2.state.title)
        self.assertEqual(5, vars.t2.order)

        # Moving to a complete state updates the complete value:
        t = 1494345365.1
        with mock.patch('time.time', return_value=t):
            self.board.move(vars.t2.id, vars.t1.id, self._state_id('Done'), 6)
        self.assertEqual(dict(generation=vars.gen8, tasks=dict(adds=[vars.t2])),
                         self.board.updates(vars.gen7))
        self.assertTrue(vars.gen8 > vars.gen7)

        self.assertEqual(vars.t1, vars.t2.parent)
        self.assertEqual('Done', vars.t2.state.title)
        self.assertEqual(6, vars.t2.order)
        self.assertEqual(t, vars.t2.complete)

        # But moves that keep the complete state don't
        t2 = t + 9
        with mock.patch('time.time', return_value=t2):
            self.board.move(vars.t2.id, vars.t3.id, self._state_id('Done'), 7)
        self.assertEqual(dict(generation=vars.gen9, tasks=dict(adds=[vars.t2])),
                         self.board.updates(vars.gen8))
        self.assertTrue(vars.gen9 > vars.gen8)

        self.assertEqual(vars.t3, vars.t2.parent)
        self.assertEqual('Done', vars.t2.state.title)
        self.assertEqual(7, vars.t2.order)
        self.assertEqual(t, vars.t2.complete)

        # And moves out of the done state clear it:
        self.board.move(vars.t2.id, vars.t3.id, self._state_id('Doing'), 7)
        self.assertEqual(dict(generation=vars.genq, tasks=dict(adds=[vars.t2])),
                         self.board.updates(vars.gen9))

        self.assertEqual(vars.t3, vars.t2.parent)
        self.assertEqual('Doing', vars.t2.state.title)
        self.assertEqual(7, vars.t2.order)
        self.assertEqual(None, vars.t2.complete)
