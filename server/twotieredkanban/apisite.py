import bobo

from .apiutil import Sync, post, put

@bobo.scan_class
class Site(Sync):
    pass
