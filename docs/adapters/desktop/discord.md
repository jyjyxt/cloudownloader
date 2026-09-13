# Discord

Control the **Discord Desktop App** from the terminal via Chrome DevTools Protocol (CDP).

## Prerequisites

Launch with remote debugging port:
```bash
/Applications/Discord.app/Contents/MacOS/Discord --remote-debugging-port=9232
```

## Setup

```bash
export CLOUDL_CDP_ENDPOINT="http://127.0.0.1:9232"
```

## Commands

| Command | Description |
|---------|-------------|
| `cloudl discord-app status` | Check CDP connection |
| `cloudl discord-app send "message"` | Send a message in the active channel |
| `cloudl discord-app read` | Read recent messages |
| `cloudl discord-app channels` | List channels in the current server, including `guild_id`, `channel_id`, and `url` |
| `cloudl discord-app servers` | List visible joined servers, including `guild_id` and `url` |
| `cloudl discord-app goto` | Open a channel by id/name/url without sending messages |
| `cloudl discord-app threads` | List visible forum/thread posts in a channel |
| `cloudl discord-app thread-read` | Read a forum/thread post by id or URL |
| `cloudl discord-app search "query"` | Search messages (Cmd+F) |
| `cloudl discord-app members` | List online members |
| `cloudl discord-app delete MESSAGE_ID` | Delete a message by its ID |

## Read-only channel targeting

```bash
# Get stable channel ids/URLs from the currently open server.
cloudl discord-app channels -f json

# Open one channel without clicking the UI.
cloudl discord-app goto --url https://discord.com/channels/<guild_id>/<channel_id>
cloudl discord-app goto --guild <guild_id> --channel <channel_id>

# Read after navigating internally. Omitting the target keeps the old behavior:
# read the currently active channel.
cloudl discord-app read --url https://discord.com/channels/<guild_id>/<channel_id> --count 20 -f json
cloudl discord-app read --guild <guild_id> --channel <channel_id> --count 20 -f json
```

Passing numeric IDs or a channel URL is the most stable mode. Name lookup is
best-effort for channels visible in the current Discord sidebar.

Opening a channel through Discord's own route can update Discord's normal
client-side read/unread state, just like manually opening the channel.

## Forum and thread-style channels

```bash
# List visible forum/thread post cards from the active or targeted channel.
cloudl discord-app threads --url https://discord.com/channels/<guild_id>/<forum_channel_id> -f json

# Read a selected post/thread.
cloudl discord-app thread-read --url https://discord.com/channels/<guild_id>/<forum_channel_id>/<thread_id> --count 20 -f json
cloudl discord-app thread-read --guild <guild_id> --channel <forum_channel_id> --thread <thread_id> --count 20 -f json
```
