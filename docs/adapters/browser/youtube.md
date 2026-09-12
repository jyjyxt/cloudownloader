# YouTube

**Mode**: 🔐 Browser · **Domain**: `youtube.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl youtube search` | Search videos |
| `cloudl youtube video` | Get video metadata |
| `cloudl youtube transcript` | Get video transcript/subtitles |
| `cloudl youtube comments` | Get video comments |
| `cloudl youtube channel` | Get channel info and videos |
| `cloudl youtube playlist` | Get playlist video list |
| `cloudl youtube feed` | Homepage recommended videos |
| `cloudl youtube history` | Watch history |
| `cloudl youtube watch-later` | Watch Later queue |
| `cloudl youtube subscriptions` | List subscribed channels |
| `cloudl youtube like` | Like a video |
| `cloudl youtube unlike` | Remove like from a video |
| `cloudl youtube subscribe` | Subscribe to a channel |
| `cloudl youtube unsubscribe` | Unsubscribe from a channel |

## Usage Examples

```bash
# Read commands
cloudl youtube feed --limit 10
cloudl youtube history --limit 20
cloudl youtube watch-later --limit 50
cloudl youtube subscriptions --limit 30

# Search and video info
cloudl youtube search "rust programming" --limit 5
cloudl youtube video "https://www.youtube.com/watch?v=xxx"
cloudl youtube transcript "https://www.youtube.com/watch?v=xxx"

# Write commands (requires login)
cloudl youtube like "https://www.youtube.com/watch?v=xxx"
cloudl youtube unlike "videoId"
cloudl youtube subscribe "@ChannelHandle"
cloudl youtube unsubscribe "UCxxxxxxxxxxxxxx"
```

## Prerequisites

- Chrome running and **logged into** youtube.com
- [Browser Bridge extension](/guide/browser-bridge) installed
