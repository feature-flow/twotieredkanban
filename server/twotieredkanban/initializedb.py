from .sql import evolve

def config(options):
    global dsn
    dsn = options['dsn']

def initialize(db):
    evolve(dsn)

