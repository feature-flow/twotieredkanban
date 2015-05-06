controllers = angular.module("kb.controllers", [])

controllers.controller("main", ($scope) ->
  $scope.projects =
    t1:
      name: "Build one"
      state: "Ready"
      tasks:
        Ready:
          t11:
            name: "sit on it"
          t12:
            name: "get up"
    t2:
      name: "Walk the dog"
      state: "Development"
      tasks:
        Ready:
          t22:
            name: "walk"
        Doing:
          t21:
            name: "put on leash"
    t3:
      name: "Build another"
      state: "Ready"
      tasks:
        Ready:
          t31:
            name: "sit on it"
          t32:
            name: "get up"

  $scope.states = [
      name: "Backlog"
      projects: []
    ,
      name: "Ready"
      projects: [$scope.projects.t1, $scope.projects.t3]
    ,
      name: "Development"
      projects: [$scope.projects.t2]
      substates: [
        "Ready"
        "Doing"
        "NeedsReview"
        "Review"
        "Done"
        ]
    ,
      name: "Acceptance"
      projects: []
    ,
      name: "Deploying"
      projects: []
    ,
      name: "Win"
      projects: []
    ]
)
