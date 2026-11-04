# Agent notes

Read `DESIGN.md` before building or changing any screen. `README.md` covers setup and checks, and `TASKS.md` tracks progress.

## Convex access in cloud sessions
- When a task needs the Convex CLI against a hosted deployment (env vars, logs, data, `convex run`, deploys) and the session has no Convex login or deploy key, use the device login. Don't ask DQ for a deploy key.
- Run it in the background: `npx convex login --no-open --login-flow poll --device-name "claude-cloud-session"`. Send DQ the `https://auth.convex.dev/device?user_code=…` link and the code it prints (they expire in 5 minutes; start a new login if it lapses), then wait for the command to exit. `npx convex login status` confirms it.
- Name the deployment on each command with `--deployment <name>`. Production is `avid-mole-890`.
- The login reaches every project on the FollowUs AI team. Stay read-only unless the task asks for a change, and say before running anything that writes to production.
