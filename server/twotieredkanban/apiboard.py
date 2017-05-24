import bobo
import datetime
import json
import logging
import time
import webob

from .apiutil import Sync, get, post, put

logger = logging.getLogger(__name__)

@bobo.scan_class
class Board(Sync):

    @post("/projects")
    def add_project(self, title, order, description=''):
        self.context.new_project(title, description=description, order=order)
        return self.response()

    @put("/move/:task_id")
    def move(self, task_id, state_id=None, order=None, parent_id=None):
        self.context.move(task_id, parent_id, state_id, order)
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

    # @delete("/tasks/:task_id")
    # def delete_task(self, request, task_id):
    #     self.context.archive_task(task_id)
    #     return self.response()
