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
    def add_project(self, title, description, order):
        self.context.new_release(title, description=description, order=order)
        return self.response()

    @put("/projects/:id")
    def update_release(self, id, title, description):
        self.context.update_task(id, title=title, description=description)
        return self.response()

    @put("/move/:task_id")
    def move(self, task_id, state, order, parent_id=None):
        self.context.move(task_id, parent_id, state, order)
        return self.response()

    @post("/releases/:release_id")
    def add_task(self, release_id, name, order,
                 description='', size=1, blocked='', assigned=None):
        task = self.context.new_task(
            release_id, name, description=description,
            size=size, blocked=blocked, assigned=assigned,
            order=order,
            )
        return self.response()

    @put("/tasks/:task_id")
    def update_task(self, task_id, name=None,
                    description=None, size=None, blocked=None, assigned=None,
                    ):
        self.context.update_task(
            task_id, name=name, description=description,
            size=size, blocked=blocked, assigned=assigned)
        return self.response()

    # @delete("/tasks/:task_id")
    # def delete_task(self, request, task_id):
    #     self.context.archive_task(task_id)
    #     return self.response()
