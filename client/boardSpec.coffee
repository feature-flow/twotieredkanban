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

  # Initial users:
  it("Can be populated by updates", ->
    board.apply_updates(
      adds: [
          admins: ['admin@example.com']
          id: ''
          users: ['admin@example.com']
          ]
      generation: 3
      )
    expect(board.users.length).toBe(1)
    expect(board.admins.length).toBe(1)
    expect(board.generation).toBe(3)

    # Add release:
    board.apply_updates(
      adds: [
        adds: [
          assigned: null
          blocked: ''
          created: 1406405514
          description: 'Build the kanban'
          id: '00000000000000000000000000000001'
          name: 'kanban'
          size: 0
          state: null
          ]
        id: '00000000000000000000000000000001'
        ]
      generation: 4
    )
    expect(board.states_by_name.backlog.projects.length).toBe(1)
    project = board.states[0].projects[0]
    expect(board.tasks[project.id]).toBe(project)
    expect(project.id).toBe('00000000000000000000000000000001')
    expect(project.name).toBe("kanban")
    expect(project.description).toBe("Build the kanban")
    expect(project.size).toBe(0)
    expect(project.state).toBe('backlog')
    for state, tasks of project.tasks
      expect(tasks.length).toBe(0)

    expect(board.generation).toBe(4)

    # Create task:
    board.apply_updates(
      adds: [
        adds: [
            assigned: null
            blocked: ''
            created: 1406405514
            description: 'Create backend'
            id: '00000000000000000000000000000002'
            name: 'backend'
            size: 1
            state: null
          ,
            assigned: null
            blocked: ''
            created: 1406405514
            description: 'Build the kanban'
            id: '00000000000000000000000000000001'
            name: 'kanban'
            size: 1
            state: null
          ]
        id: '00000000000000000000000000000001'
        ]
      generation: 6
    )
    expect(board.states_by_name.backlog.projects.length).toBe(1)
    expect(project.size).toBe(1)
    task = board.tasks['00000000000000000000000000000002']
    expect(task.id).toBe('00000000000000000000000000000002')
    expect(task.blocked).toBe('')
    expect(task.description).toBe('Create backend')
    expect(task.name).toBe('backend')
    expect(task.size).toBe(1)
    expect(task.state).toBe('ready')
    expect(task.parent).toBe(project)

    expect(project.tasks[null]).toEqual([task])
    expect(project.tasks['ready']).toEqual([task])

    expect(board.generation).toBe(6)

    # Move a release and update a task
    board.apply_updates(
      adds: [
        adds: [
            assigned: null
            blocked: ''
            created: 1406405514
            description: 'Build the kanban'
            id: '00000000000000000000000000000001'
            name: 'kanban'
            size: 1
            state: 'development'
          ,
            assigned: null
            blocked: ''
            created: 1406405514
            description: 'Create backend'
            id: '00000000000000000000000000000002'
            name: 'backend'
            size: 2
            state: 'ready'
          ]
        id: '00000000000000000000000000000001'
        ]
      generation: 8
    )
    expect(project.state).toBe('development')
    expect(board.generation).toBe(8)
    expect(board.states[0].projects.length).toBe(0)
    expect(board.states[2].projects.length).toBe(1)
    expect(task.size).toBe(2)
    expect(task.state).toBe('ready')

    # Move a task
    board.apply_updates(
      adds: [
        adds: [
            assigned: null
            blocked: ''
            created: 1406405514
            description: 'Create backend'
            id: '00000000000000000000000000000002'
            name: 'backend'
            size: 2
            state: 'needs_review'
          ]
        id: '00000000000000000000000000000001'
        ]
      generation: 8
    )
    expect(task.state).toBe('needs_review')
    expect(project.tasks[null]).toEqual([task])
    expect(project.tasks['needs_review']).toEqual([task])
    expect(project.tasks['ready'].length).toBe(0)
  )

)

