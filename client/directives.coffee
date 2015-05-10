directives = angular.module("kb.directives", [])

directives.directive("kbProjectColumn", ->
  restrict: "A"
  replace: true
  templateUrl: "kbProjectColumn.html"
  link: (scope, el) ->

    projects = scope.state.projects
    scope.projects = projects

    drag_type = "text/project"

    el.bind("dragover", (ev) ->
      if drag_type in ev.dataTransfer.types
          ev.preventDefault()
          false
      else
          true
      )

    el.bind("drop", (ev) ->
      if drag_type in ev.dataTransfer.types
        ev.preventDefault()
        id = ev.dataTransfer.getData(drag_type)
        project = scope.board.tasks[id]
        if project.state != scope.state.name
          scope.$apply(->
            old_projects = scope.board.states_by_name[project.state].projects
            index = old_projects.indexOf(project)
            old_projects[index .. index] = []
            project.state = scope.state.name
            projects.push(project)
          )
      )

    )

directives.directive("kbProject", ->
  restrict: "E"
  replace: true
  templateUrl: "kbProject.html"
  link: (scope, el) ->
    el.bind("dragstart", (ev) ->
      if not ev.dataTransfer.types.length
        ev.dataTransfer.setData("text/project", ev.target.id)
      )
  )

directives.directive("kbTaskColumn", ->
  restrict: "A"
  replace: true
  templateUrl: "kbTaskColumn.html"
  link: (scope, el) ->
    tasks = scope.project.tasks[scope.state]
    if not tasks?
      tasks = []
      scope.project.tasks[scope.state] = tasks
    scope.tasks = tasks

    drag_type = "text/" + scope.project.id

    el.bind("dragover", (ev) ->
      if drag_type in ev.dataTransfer.types
        ev.preventDefault()
        false
      else
        true
      )

    el.bind("drop", (ev) ->
      if drag_type in ev.dataTransfer.types
        ev.preventDefault()
        id = ev.dataTransfer.getData(drag_type)
        task = scope.board.tasks[id]
        if task.state != scope.state
          scope.$apply(->
            old_tasks = scope.project.tasks[task.state]
            index = old_tasks.indexOf(task)
            old_tasks[index .. index] = []
            task.state = scope.state
            tasks.push(task)
          )
      )
  )

directives.directive("kbTask", ->
  restrict: "E"
  replace: true
  templateUrl: "kbTask.html"
  link: (scope, el) ->
    el.bind("dragstart", (ev) ->
      ev.dataTransfer.setData("text/" + scope.project.id, ev.target.id)
      )
  )
