import json
import os

with open(os.path.splitext(__file__)[0] + '.json') as f:
    globals().update({k: tuple(v) for (k, v) in json.load(f).items()})
