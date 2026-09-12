# Facebook

**Mode**: 🔐 Browser · **Domain**: `facebook.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl facebook profile` | Get user/page profile info |
| `cloudl facebook notifications` | Get recent notifications with `unread` / `time` / `url` / `notif_id` / `notif_type` |
| `cloudl facebook feed` | Get news feed posts |
| `cloudl facebook search` | Search people, pages, posts |
| `cloudl facebook marketplace-listings` | List your Marketplace seller listings |
| `cloudl facebook marketplace-inbox` | List recent Marketplace buyer/seller conversations |
| `cloudl facebook post` | Publish a text post with an optional image |

## Usage Examples

```bash
# View a profile
cloudl facebook profile zuck

# Get notifications (default 15, max 100)
cloudl facebook notifications --limit 10

# News feed
cloudl facebook feed --limit 5

# Search
cloudl facebook search "OpenAI" --limit 5

# Marketplace seller listings and inbox
cloudl facebook marketplace-listings --limit 10
cloudl facebook marketplace-inbox --limit 10

# Publish a post
cloudl facebook post "Hello from OpenCLI"
cloudl facebook post "Photo update" --image /path/to/photo.jpg

# JSON output
cloudl facebook profile zuck -f json
```

## Output

### `notifications`

| Column | Type | Notes |
|--------|------|-------|
| `index` | int | 1-based row number across the returned page |
| `unread` | bool | Derived from the explicit `<div>未读</div>` / `<div>Unread</div>` badge child; falls back to the anchor text prefix |
| `text` | string | Notification body text. Read first from the per-row "Mark as read" button's `aria-label` (with the locale prefix stripped) so it does not include the unread badge or trailing time. Full body, **no silent truncation** |
| `time` | string \| null | Time-ago label from the row's `<abbr>`, e.g. `2天` / `5 hrs`. `null` when the abbr is missing — never the legacy `'-'` sentinel |
| `url` | string | Full notification anchor href, including `notif_id` / `notif_t` query params, so callers can follow up |
| `notif_id` | string \| null | `notif_id` query param parsed from `url`; `null` when absent |
| `notif_type` | string \| null | `notif_t` query param (e.g. `onthisday`, `approve_from_another_device`, `group_recommendation`); `null` when absent |

`--limit` accepts a positive integer in `[1, 100]`. Out-of-range or
non-numeric input raises `ArgumentError` upfront — no silent clamp.

If Facebook redirects to a login/checkpoint path (for example
`/login.php`, `/login/identify/`, or `/checkpoint/`; session expired)
the command raises `AuthRequiredError`. An empty notification list after
a successful auth check raises `EmptyResultError` instead of a silent
`[]`.

## Prerequisites

- Chrome running and **logged into** facebook.com
- [Browser Bridge extension](/guide/browser-bridge) installed
