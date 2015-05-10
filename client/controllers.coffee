controllers = angular.module("kb.controllers", ["kb.board"])

controllers.controller("main", ($scope, Board) ->

  $scope.board = Board
)
