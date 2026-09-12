# Bluesky

**Mode**: 🌐 Public · **Domain**: `bsky.app`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl bluesky profile` | User profile info |
| `cloudl bluesky user` | Recent posts from a user |
| `cloudl bluesky trending` | Trending topics |
| `cloudl bluesky search` | Search users |
| `cloudl bluesky feeds` | Popular feed generators |
| `cloudl bluesky followers` | User's followers |
| `cloudl bluesky following` | Accounts a user follows |
| `cloudl bluesky thread` | Post thread with replies |
| `cloudl bluesky starter-packs` | User's starter packs |

## Usage Examples

```bash
# User profile
cloudl bluesky profile --handle bsky.app

# Recent posts
cloudl bluesky user --handle bsky.app --limit 10

# Trending topics
cloudl bluesky trending --limit 10

# Search users
cloudl bluesky search --query "AI" --limit 10

# Popular feeds
cloudl bluesky feeds --limit 10

# Followers / following
cloudl bluesky followers --handle bsky.app --limit 10
cloudl bluesky following --handle bsky.app

# Post thread with replies
cloudl bluesky thread --uri "at://did:.../app.bsky.feed.post/..."

# Starter packs
cloudl bluesky starter-packs --handle bsky.app

# JSON output
cloudl bluesky profile --handle bsky.app -f json
```

## Prerequisites

None — all commands use the public Bluesky AT Protocol API, no browser or login required.
