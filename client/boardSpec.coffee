describe("Kanban Board", ->

  beforeEach(module("kb.board"))

  board = null
  beforeEach(inject((Board) -> board = Board))
  
  it("Starts out empty", ->
    for state in board.states
      expect(state.projects.length).toBe(0)
    expect(board.users.length).toBe(0)
    expect(board.admins.length).toBe(0)
    )

  # Initial users and states:
  it("Can be populated by updates", ->
    board.apply_updates(
      {
        "generation": 13,
        "kanban": {
          "admins": [
            "admin@example.com"
          ],
          "users": [
            "admin@example.com"
          ]
        },
        "states": {
          "adds": [
            {
              "complete": false,
              "id": "00000000000000000000000000000001",
              "label": "Backlog",
              "order": 0,
              "parent": null,
              "working": false
            },
            {
              "complete": false,
              "id": "00000000000000000000000000000002",
              "label": "Ready",
              "order": 1048576,
              "parent": null,
              "working": false
            },
            {
              "complete": false,
              "id": "00000000000000000000000000000003",
              "label": "Development",
              "order": 2097152,
              "parent": null,
              "working": false
            },
            {
              "complete": false,
              "id": "00000000000000000000000000000004",
              "label": "Ready",
              "order": 2097152,
              "parent": "00000000000000000000000000000003",
              "working": false
            },
            {
              "complete": false,
              "id": "00000000000000000000000000000005",
              "label": "Doing",
              "order": 2097152,
              "parent": "00000000000000000000000000000003",
              "working": true
            },
            {
              "complete": false,
              "id": "00000000000000000000000000000006",
              "label": "Needs review",
              "order": 2097152,
              "parent": "00000000000000000000000000000003",
              "working": false
            },
            {
              "complete": false,
              "id": "00000000000000000000000000000007",
              "label": "Review",
              "order": 2097152,
              "parent": "00000000000000000000000000000003",
              "working": true
            },
            {
              "complete": true,
              "id": "00000000000000000000000000000008",
              "label": "Done",
              "order": 2097152,
              "parent": "00000000000000000000000000000003",
              "working": false
            },
            {
              "complete": false,
              "id": "00000000000000000000000000000009",
              "label": "Acceptance",
              "order": 3145728,
              "parent": null,
              "working": false
            },
            {
              "complete": false,
              "id": "00000000000000000000000000000010",
              "label": "Deploying",
              "order": 4194304,
              "parent": null,
              "working": false
            },
            {
              "complete": false,
              "id": "00000000000000000000000000000011",
              "label": "Deployed",
              "order": 5242880,
              "parent": null,
              "working": false
            }
          ]
        }
      }
      )
    expect(board.users.length).toBe(1)
    expect(board.admins.length).toBe(1)
    expect(board.generation).toBe(13)
    expect(board.states.length).toBe(6)
    expect(board.states[2].substates.length).toBe(5)

    # Add release:
    board.apply_updates(
      {
        "generation": 15,
        "tasks": {
          "adds": [
            {
              "description": "Build the kanban",
              "id": "00000000000000000000000000000012",
              "name": "kanban",
              "state": null
            }
          ]
        }
      }
    )
    expect(board.states[0].projects.length).toBe(1)
    project = board.states[0].projects[0]
    expect(board.tasks[project.id]).toBe(project)
    expect(project.id).toBe('00000000000000000000000000000012')
    expect(project.name).toBe("kanban")
    expect(project.description).toBe("Build the kanban")
    expect(project.size).toBe(0)
    expect(project.state).toBe(board.states[0].id)
    for state, tasks of project.tasks
      expect(tasks.length).toBe(0)

    expect(board.generation).toBe(15)

    # Create task:
    data = {
        "generation": 16,
        "tasks": {
          "adds": [
            {
              "assigned": null,
              "blocked": null,
              "created": 1406405514,
              "description": "Create backend",
              "id": "00000000000000000000000000000013",
              "name": "backend",
              "parent": "00000000000000000000000000000012",
              "size": 1,
              "state": null
            }
          ]
        }
      }
    board.apply_updates(data)
    expect(board.states[0].projects.length).toBe(1)
    expect(project.size).toBe(1)
    task = board.tasks[data.tasks.adds[0].id]
    expect(task.id).toBe(data.tasks.adds[0].id)
    expect(task.blocked).toBe(null)
    expect(task.description).toBe('Create backend')
    expect(task.name).toBe('backend')
    expect(task.size).toBe(1)
    expect(task.state).toBe(board.default_substate)
    expect(task.parent).toBe(project)
    expect(project.tasks[null]).toEqual([task])
    expect(project.tasks[board.default_substate]).toEqual([task])
    expect(board.generation).toBe(data.generation)
    expect(project.size).toBe(1)

    # Update a release
    data = {
      "generation": 17,
      "tasks": {
        "adds": [
          {
            "description": "",
            "id": "00000000000000000000000000000012",
            "name": "kanban development",
            "state": null
          }
        ]
      }
    }
    board.apply_updates(data)
    expect(project.name).toBe("kanban development")

    # Update a task
    data = {
      "generation": 18,
      "tasks": {
        "adds": [
          {
            "assigned": "user2@example.com",
            "blocked": null,
            "created": 1406405514,
            "description": "",
            "id": "00000000000000000000000000000013",
            "name": "backend",
            "parent": "00000000000000000000000000000012",
            "size": 2,
            "state": null
          }
        ]
      }
    } 
    board.apply_updates(data)
    expect(task.assigned).toBe(data.tasks.adds[0].assigned)
    expect(task.size).toBe(data.tasks.adds[0].size)
    expect(project.size).toBe(2)
    old_state = task.state
    expect(old_state).toBe(board.default_substate)
    expect(project.tasks[task.state].length).toBe(1)

    # Move a task
    data = {
      "generation": 19,
      "tasks": {
        "adds": [
          {
            "assigned": "user2@example.com",
            "blocked": null,
            "created": 1406405514,
            "description": "",
            "id": "00000000000000000000000000000013",
            "name": "backend",
            "parent": "00000000000000000000000000000012",
            "size": 1,
            "state": "00000000000000000000000000000006"
          }
        ]
      }
    }
    board.apply_updates(data)
    expect(task.state).toBe(data.tasks.adds[0].state)
    expect(project.tasks[task.state].length).toBe(1)
    expect(project.tasks[old_state].length).toBe(0)
    expect(board.states[2].substates[2].id).toBe(task.state)

    # Move a project
    data = {
        "generation": 20,
        "tasks": {
          "adds": [
            {
              "description": "",
              "id": "00000000000000000000000000000012",
              "name": "kanban development",
              "state": "00000000000000000000000000000010"
            }
          ]
        }
      }
    board.apply_updates(data)
    expect(project.state).toBe(data.tasks.adds[0].state)
    expect(board.states[0].projects.length).toBe(0)
    expect(board.states[4].projects.length).toBe(1)
  )
)

