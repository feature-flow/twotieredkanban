- Bugs

  - Tasks don't update after edit
  - Edit forms don't clear assigned
  - Need tests for client sode server api


- Design landing page (/):

  - Attractive
  - Probably: No need for menu. Put the menu on the landing page.

- User-management

  - Richer user model: id, name, email and nick

    How these are determined depends on auth scheme.  For example, id
    and nicks the same for github, email and id the same for google.

  - Will be pluggable based on auth scheme.  Plug points include:

    - Login

    - User admin

  - Demo "login" page.

  - Demo user management.

- First server auth implementation. Prob: email+pw.

- longpoll properly (threadpool for everything else)

- burn-down chart
- velocity
- sample project for demo

- export/import
- archive
- browse archive
- help/feedback
- integration with tools:
  - github
  - jira
