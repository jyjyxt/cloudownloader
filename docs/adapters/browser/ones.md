# ONES

**Mode**: 🔐 Browser Bridge · **Domain**: `ones.cn` (self-hosted via `ONES_BASE_URL`)

## Commands

| Command | Description |
|---------|-------------|
| `cloudl ones login` | Login via Project API (`auth/login`) |
| `cloudl ones me` | Current user profile (`users/me`) |
| `cloudl ones token-info` | Token/user/team summary (`auth/token_info`) |
| `cloudl ones tasks` | Team task list with status/project labels and hours |
| `cloudl ones my-tasks` | My tasks (`assign`/`field004`/`owner`/`both`) |
| `cloudl ones task` | Task detail by UUID (`team/:team/task/:id/info`) |
| `cloudl ones worklog` | Log/backfill hours (GraphQL `addManhour` first, then REST fallbacks) |
| `cloudl ones logout` | Logout (`auth/logout`) |

## Usage Examples

```bash
# Required: your ONES base URL
export ONES_BASE_URL=https://your-instance.example.com

# Optional if your deployment requires auth headers
# export ONES_USER_ID=...
# export ONES_AUTH_TOKEN=...

# Login/profile
cloudl ones login --email you@company.com --password 'your-password'
cloudl ones me
cloudl ones token-info

# Task lists
cloudl ones tasks <teamUUID> --limit 20
cloudl ones tasks <teamUUID> --project <projectUUID> --assign <userUUID>
cloudl ones my-tasks <teamUUID> --limit 100
cloudl ones my-tasks <teamUUID> --mode both

# Task detail
cloudl ones task <taskUUID> --team <teamUUID>

# Worklog: today / backfill
cloudl ones worklog <taskUUID> 2 --team <teamUUID>
cloudl ones worklog <taskUUID> 1.5 --team <teamUUID> --date 2026-03-23 --note "integration"

cloudl ones logout
```

## Prerequisites

- Chrome running and logged into your ONES instance
- [Browser Bridge extension](/guide/browser-bridge) installed
- `ONES_BASE_URL` set to the same origin opened in Chrome

## Notes

- This adapter targets legacy ONES Project API deployments.
- `ONES_TEAM_UUID` can be set to omit `--team` in `tasks` / `my-tasks` / `task`.
- Hours display and input use `ONES_MANHOUR_SCALE` (default `100000`).
