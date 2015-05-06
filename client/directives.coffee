directives = angular.module("kb.directives", [])

directives.directive("kbProjectColumn", ->
  restrict: "E"
  replace: true
  templateUrl: "kbProjectColumn.html"
  )
directives.directive("kbExpandedColumn", ->
  restrict: "E"
  replace: true
  templateUrl: "kbExpandedColumn.html"
  )
directives.directive("kbProject", ->
  restrict: "E"
  replace: true
  templateUrl: "kbProject.html"
  )
directives.directive("kbExpandedProject", ->
  restrict: "E"
  replace: true
  templateUrl: "kbExpandedProject.html"
  )
directives.directive("kbTaskColumn", ->
  restrict: "E"
  replace: true
  templateUrl: "kbTaskColumn.html"
  link: (scope, el, attrs) ->
    scope.tasks = (task for own tid, task of scope.project.tasks[scope.state])
  )
directives.directive("kbTask", ->
  restrict: "E"
  replace: true
  templateUrl: "kbTask.html"
  )
