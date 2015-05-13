controllers = angular.module("kb.controllers", ["kb.board", "ngMaterial"])

controllers.controller("kbNewProject", ($scope, Board, Server, $mdDialog) ->

  $scope.hide = ->
     $mdDialog.hide()
  $scope.cancel = ->
    $mdDialog.cancel()

  $scope.new_project = (event) ->
    Server.new_project($scope.project_name)
    $scope.hide()
  )

controllers.controller("main", ($scope, Board, $mdDialog) ->
  $scope.board = Board

  $scope.new_project = (event) ->
    $mdDialog.show(
      controller: "kbNewProject"
      templateUrl: "kbNewProject.html"
      targetEvent: event
      )
)
