# V2EX

**Mode**: 🌐 / 🔐 · **Domain**: `v2ex.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl v2ex hot` | Hot topics |
| `cloudl v2ex latest` | Latest topics |
| `cloudl v2ex topic <id>` | Topic detail |
| `cloudl v2ex node <name>` | Topics by node |
| `cloudl v2ex user <username>` | Topics by user |
| `cloudl v2ex member <username>` | User profile |
| `cloudl v2ex replies <id>` | Topic replies |
| `cloudl v2ex nodes` | All nodes (sorted by topic count) |
| `cloudl v2ex daily` | Daily hot |
| `cloudl v2ex me` | My profile (auth required) |
| `cloudl v2ex notifications` | My notifications (auth required) |

## Usage Examples

```bash
# Hot topics
cloudl v2ex hot --limit 5

# Browse topics in a node
cloudl v2ex node python

# View topic replies
cloudl v2ex replies 1000

# User's topics
cloudl v2ex user Livid

# User profile
cloudl v2ex member Livid

# List all nodes
cloudl v2ex nodes --limit 10

# JSON output
cloudl v2ex hot -f json
```

## Prerequisites

Most commands (`hot`, `latest`, `topic`, `node`, `user`, `member`, `replies`, `nodes`) use the public V2EX API and **require no browser or login**.

For `daily`, `me`, and `notifications`:

- Chrome running and **logged into** v2ex.com
- [Browser Bridge extension](/guide/browser-bridge) installed
