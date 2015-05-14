controllers = angular.module("kb.controllers", ["kb.board", "ngMaterial"])

controllers.controller("kbNewProject", ($scope, Server, $mdDialog) ->

  $scope.hide = ->
     $mdDialog.hide()
  $scope.cancel = ->
    $mdDialog.cancel()

  $scope.submit = () ->
    Server.new_project($scope.project_name, $scope.project_description)
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
