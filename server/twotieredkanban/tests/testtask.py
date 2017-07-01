import mock
import unittest

class TaskTests(unittest.TestCase):

    @mock.patch('twotieredkanban.board.now')
    def test_creation(self, now):
        from ..board import State, Task

        now.return_value = '2017-06-08T10:02:00.004'
        import uuid
        id = uuid.uuid1()
        with mock.patch('uuid.uuid1', return_value=id):
            task = Task(self, 'the task', 42, 'the description',
                        state = State(1, 'test'))

        self.assertEqual(self, task.board)

        self.assertEqual(
            dict(id = id.hex,
                 title = 'the task',
                 description = 'the description',
                 order = 42,
                 state = 'test',
                 parent = None,
                 blocked = None,
                 assigned = None,
                 size = 1,
                 history=(
                     dict(start='2017-06-08T10:02:00.004', state='test'),
                     ),
                 ),
            task.json_reduce())

        task.tasks = []
        self.assertEqual(
            dict(id = id.hex,
                 title = 'the task',
                 description = 'the description',
                 order = 42,
                 state = 'test',
                 parent = None,
                 blocked = None,
                 assigned = None,
                 size = 1,
                 history=(
                     dict(start='2017-06-08T10:02:00.004', state='test'),
                     ),
                 tasks = [],
                 ),
            task.json_reduce())
