# Reddit

**Mode**: 🔐 Browser · **Domain**: `reddit.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl reddit hot` | Hot posts from a subreddit (or frontpage if none) |
| `cloudl reddit frontpage` | Frontpage / r/all listing |
| `cloudl reddit home` | **Personalized Best feed (requires login)** |
| `cloudl reddit popular` | Trending posts on /r/popular |
| `cloudl reddit search` | Search posts |
| `cloudl reddit subreddit` | Posts from a specific subreddit, with sort and time filters |
| `cloudl reddit subreddit-info` | **Subreddit metadata (subscribers, active, NSFW, created, description)** |
| `cloudl reddit read` | Read a post thread with comments |
| `cloudl reddit user` | View a user profile |
| `cloudl reddit user-posts` | A user's submitted posts |
| `cloudl reddit user-comments` | A user's comments |
| `cloudl reddit whoami` | **Show the currently logged-in Reddit identity** |
| `cloudl reddit upvote` | Vote on a post or comment |
| `cloudl reddit save` | Save / unsave a post or comment |
| `cloudl reddit comment` | Comment on a post |
| `cloudl reddit reply` | Reply to a comment |
| `cloudl reddit subscribe` | Join / leave a subreddit |
| `cloudl reddit subscribed` | List subreddits you are subscribed to |
| `cloudl reddit saved` | List your saved items |
| `cloudl reddit upvoted` | List your upvoted posts |

## Usage Examples

```bash
# Quick start
cloudl reddit hot --limit 5

# Read one subreddit
cloudl reddit subreddit python --limit 10

# Subreddit metadata (subscribers / active / NSFW / created / description)
cloudl reddit subreddit-info AskReddit

# Personalized Best feed (requires login)
cloudl reddit home --limit 10

# Who am I logged in as?
cloudl reddit whoami

# Subscribed subreddits (requires login)
cloudl reddit subscribed --limit 50

# Read a post thread
cloudl reddit read 1abc123 --depth 2

# Read with "more comments" expansion via /api/morechildren.json
cloudl reddit read 1abc123 --depth 3 --expand-more --expand-rounds 3

# Comment on a post
cloudl reddit comment 1abc123 "Great post"

# Reply to a comment
cloudl reddit reply okf3s7u "Thanks for the context"

# JSON output
cloudl reddit hot -f json

# Verbose mode
cloudl reddit hot -v
```

## Auth-required commands

`whoami`, `home`, `subscribed`, `saved`, `upvoted`, `subscribe`, `upvote`,
`save`, `comment`, and `reply` all require a logged-in `reddit.com` cookie session. When the
session is missing or expired they raise `AuthRequiredError` (exit code 5)
instead of silently returning empty rows.

For `subreddit-info`, missing / banned / private / quarantined subreddits raise
`EmptyResultError` (exit code 6) so the output table never contains a silent
sentinel row.

For `read`, deleted / quarantined / private posts (HTTP 401/403/404 on
`/comments/<id>.json`) also raise `EmptyResultError`. `--expand-more` follows
Reddit's "more comments" stubs by calling `/api/morechildren.json` up to
`--expand-rounds` times (default 2, max 5). If the morechildren endpoint
itself rejects the request with 401/403, that's surfaced as
`AuthRequiredError` because writeable/expand endpoints often require a logged-
in session even though the post listing is public.

## Prerequisites

- Chrome running and **logged into** reddit.com
- [Browser Bridge extension](/guide/browser-bridge) installed
