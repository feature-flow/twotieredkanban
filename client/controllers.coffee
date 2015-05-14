controllers = angular.module("kb.controllers", ["kb.board", "ngMaterial"])

controllers.controller("main", ($scope, Board, $mdDialog) ->
  $scope.board = Board

  $scope.new_project = (event) ->
    $mdDialog.show(
      controller: ($scope, Server, $mdDialog) ->
        $scope.hide = -> $mdDialog.hide()
        $scope.cancel = -> $mdDialog.cancel()
        $scope.action_label = "Add"
        $scope.submit = () ->
          Server.new_project(
            $scope.project_name, $scope.project_description or "")
          $scope.hide()
      templateUrl: "kbEditProject.html"
      targetEvent: event
      )
)
