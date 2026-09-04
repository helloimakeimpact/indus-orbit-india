# Browser test boundary

`npm run test:e2e` starts the local application and runs public desktop/mobile and automated accessibility journeys. `npm run test:visual` compares the reviewed Brand baselines.

Authenticated journeys never contain credentials. Export a short-lived signed-in Playwright storage state outside Git, place it under the ignored `playwright/.auth/` directory, and run:

```sh
PLAYWRIGHT_MEMBER_STORAGE_STATE=playwright/.auth/member.json npm run test:e2e:auth
```

Delete the state after the run. Treat it like a session credential. Production passwords, refresh tokens and TOTP seeds must never enter fixtures, shell history, CI logs or GitHub.
