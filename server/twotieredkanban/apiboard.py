import bobo
from contextlib import closing
import datetime
import json
import logging
import newt.db.search
import time
import webob

from . import sql
from .apiutil import Sync, delete, get, post, put

logger = logging.getLogger(__name__)

@bobo.scan_class
class Board(Sync):

    @post("/projects")
    def add_project(self, title, order, description=''):
        self.context.new_project(title, description=description, order=order)
        return self.response()

    @put("/move/:task_id")
    def move(self, task_id, state_id=None, order=None, parent_id=None):
        self.context.move(task_id, parent_id, state_id, order,
                          user_id=self.base.user['id'])
        return self.response()

    @post("/project/:id")
    def add_task(self, id, title, order,
                 description='', size=1, blocked='', assigned=None):
        task = self.context.new_task(
            id, title, description=description,
            size=size, blocked=blocked, assigned=assigned,
            order=order,
            )
        return self.response()

    @put("/tasks/:task_id")
    def update_task(self, bobo_request, task_id):
        self.context.update_task(task_id, **bobo_request.json)
        return self.response()

    @post("/archive/:feature_id")
    def archive_feature(self, feature_id):
        self.context.archive_feature(feature_id)
        return self.response()

    @delete("/archive/:feature_id")
    def restore_feature(self, request, feature_id):
        self.context.restore_feature(feature_id)
        return self.response()

    @get("/archive")
    def search_archived(self, text=None, start=0, size=None):
        conn = self.context._p_jar

        if size:
            count, features = newt.db.search.where_batch(
                conn, archive_where(conn, text), (), int(start), int(size))
            return self.response(count=count, features=features)
        else:
            return self.response(
                features=newt.db.search.where(conn, archive_where(conn, text))
                )

def archive_where(context, text=None):
    q = dict(archived='true')
    if text:
        q['text'] = text
        order_by = ('text', True)
    else:
        order_by = ('modified', True)
    return sql.qbe.sql(context, q, order_by=(order_by,))
