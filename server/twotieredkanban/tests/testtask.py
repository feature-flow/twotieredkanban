import mock
import unittest

class TaskTests(unittest.TestCase):

    def test_creation(self):
        from ..board import Task

        created = 1494345365.1
        with mock.patch('time.time', return_value=created):
            import uuid
            id = uuid.uuid1()
            with mock.patch('uuid.uuid1', return_value=id):
                task = Task(self, 'the task', 42, 'the description')

            self.assertEqual(self, task.board)

            self.assertEqual(
                dict(id = id.hex,
                     title = 'the task',
                     description = 'the description',
                     order = 42,
                     state = None,
                     parent = None,
                     blocked = None,
                     created = 1494345365.1,
                     assigned = None,
                     size = 1,
                     complete = None,
                     ),
                task.json_reduce())
