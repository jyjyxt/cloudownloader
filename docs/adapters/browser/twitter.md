# Twitter / X

**Mode**: 🔐 Browser · **Domain**: `twitter.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl twitter trending` | |
| `cloudl twitter bookmarks` | |
| `cloudl twitter profile` | |
| `cloudl twitter search` | |
| `cloudl twitter timeline` | |
| `cloudl twitter thread` | |
| `cloudl twitter following` | |
| `cloudl twitter followers` | |
| `cloudl twitter notifications` | |
| `cloudl twitter device-follow` | Read the /i/timeline device-follow notification stream (tweets aggregated under a bell-icon "new posts from @userA and N others" notification) |
| `cloudl twitter post` | |
| `cloudl twitter reply` | |
| `cloudl twitter delete` | |
| `cloudl twitter like` | |
| `cloudl twitter likes` | |
| `cloudl twitter lists` | |
| `cloudl twitter list-tweets` | |
| `cloudl twitter list-create` | Create a Twitter/X list via GraphQL and return the created list id |
| `cloudl twitter list-delete` | Delete a Twitter/X list you own after explicit confirmation |
| `cloudl twitter list-add` | |
| `cloudl twitter list-add-batch` | Add multiple users to a Twitter/X list you own from a comma-separated username list |
| `cloudl twitter list-remove` | |
| `cloudl twitter list-remove-batch` | Remove multiple users from a Twitter/X list you own from a comma-separated username list |
| `cloudl twitter article` | |
| `cloudl twitter follow` | |
| `cloudl twitter unfollow` | |
| `cloudl twitter bookmark` | |
| `cloudl twitter unbookmark` | |
| `cloudl twitter block` | |
| `cloudl twitter unblock` | |
| `cloudl twitter hide-reply` | |
| `cloudl twitter download` | Download media from a profile via GraphQL UserMedia pagination, or from one tweet URL |
| `cloudl twitter accept` | |
| `cloudl twitter reply-dm` | |
| `cloudl twitter unlike` | |
| `cloudl twitter retweet` | |
| `cloudl twitter unretweet` | |
| `cloudl twitter quote` | |

## Usage Examples

```bash
# Quick start
cloudl twitter trending --limit 5

# Search top tweets (default)
cloudl twitter search "react 19"

# Search latest/live tweets
cloudl twitter search "react 19" --filter live

# Get following/followers list (supports large limits)
cloudl twitter following @elonmusk --limit 200
cloudl twitter followers @elonmusk --limit 100

# Download profile media with cursor pagination
cloudl twitter download @elonmusk --limit 50 --output ./twitter-media

# Download media from a single tweet
cloudl twitter download --tweet-url https://x.com/jack/status/20 --output ./twitter-media

# Create a list and then manage members (requires login)
cloudl twitter list-create "AI research" --description "Papers and labs" --mode private
cloudl twitter list-delete 123456789 --confirm true
cloudl twitter list-add 123456789 alice
cloudl twitter list-add-batch 123456789 "@alice,@bob" --interval 5
cloudl twitter list-remove 123456789 alice
cloudl twitter list-remove-batch 123456789 "@alice,@bob" --interval 5

# Write actions (require login). Idempotent — calling twice is safe.
cloudl twitter like https://x.com/jack/status/20
cloudl twitter unlike https://x.com/jack/status/20
cloudl twitter retweet https://x.com/jack/status/20
cloudl twitter unretweet https://x.com/jack/status/20
cloudl twitter quote https://x.com/jack/status/20 "great take"

# JSON output
cloudl twitter trending -f json

# Verbose mode
cloudl twitter trending -v
```

## Prerequisites

- Chrome running and **logged into** twitter.com
- [Browser Bridge extension](/guide/browser-bridge) installed
