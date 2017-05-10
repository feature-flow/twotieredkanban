import unittest

from .var import Var

class SiteTests(unittest.TestCase):

    def setUp(self):
        from ..site import Site
        self.site = Site('user@example.com')

    def test_new_site(self):
        self.assertEqual(self.site.admins, ['user@example.com'])
        self.assertEqual(self.site.users, ['user@example.com'])
        self.assertEqual(dict(self.site.boards), {})
        self.assertEqual(self.site, self.site.updates(0)['site'])

    def test_add_board(self):
        generation = self.site.generation
        self.site.add_board('first', 'The first one', 'Yup, the first')
        self.assertEqual([('first', Var(self, 'board'))],
                         list(self.site.boards.items()))
        self.assertEqual(self.site, self.board.site)
        self.assertEqual('first', self.board.name)
        self.assertEqual('The first one', self.board.title)
        self.assertEqual('Yup, the first', self.board.description)
        self.assertTrue(self.site.generation > generation)

        generation = self.board.generation
        self.site.add_board('second', 'The second one', 'Yup, the second')
        self.assertEqual(['first', 'second'], list(self.site.boards))

        # The original board was updated:
        self.assertTrue(self.board.generation > generation)

    def test_update_users(self):
        self.site.add_board('first', 'The first one', 'Yup, the first')
        board = self.site.boards['first']
        site_generation = self.site.generation
        board_generation = board.generation
        self.site.update_users(['kate', 'ed'], ['kate'])
        self.assertEqual(['kate', 'ed'], self.site.users)
        self.assertEqual(['kate'], self.site.admins)

        self.assertTrue(self.site.generation > site_generation)
        self.assertTrue(board.generation > board_generation)

    def test_json(self):
        self.site.add_board('first', 'The first one', 'Yup, the first')
        self.site.update_users(['kate', 'ed'], ['kate'])
        self.assertEqual(
            dict(users=['kate', 'ed'],
                 admins=['kate'],
                 boards=[dict(name='first',
                              title='The first one',
                              description='Yup, the first')]),
            self.site.json_reduce(),
            )
