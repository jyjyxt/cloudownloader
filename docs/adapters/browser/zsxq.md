# 知识星球 (ZSXQ)

**Mode**: 🔐 Browser · **Domain**: `wx.zsxq.com`

Read groups, topics, search results, dynamics, and single-topic details from [知识星球](https://wx.zsxq.com) using your logged-in Chrome session.

## Commands

| Command | Description |
|---------|-------------|
| `cloudl zsxq groups` | List the groups your account has joined |
| `cloudl zsxq topics` | List topics in the active group |
| `cloudl zsxq topic <id>` | Fetch a single topic with comments |
| `cloudl zsxq search <keyword>` | Search topics inside a group |
| `cloudl zsxq dynamics` | List recent dynamics across groups |

## Usage Examples

```bash
# List your groups
cloudl zsxq groups

# List topics from the active group in Chrome
cloudl zsxq topics --limit 20

# Search inside the active group
cloudl zsxq search "cloudl"

# Search inside a specific group explicitly
cloudl zsxq search "cloudl" --group_id 123456789

# Export a single topic with comments
cloudl zsxq topic 987654321 --comment_limit 20

# Read recent dynamics across all joined groups
cloudl zsxq dynamics --limit 20
```

## Prerequisites

- Chrome running and **logged into** [wx.zsxq.com](https://wx.zsxq.com)
- [Browser Bridge extension](/guide/browser-bridge) installed

## Notes

- `zsxq topics` and `zsxq search` use the current active group context from Chrome by default
- If there is no active group context, pass `--group_id <id>` or open the target group in Chrome first
- `zsxq groups` returns `group_id`, which you can reuse with `--group_id`
- `zsxq topic` surfaces a missing topic as `NOT_FOUND` instead of a generic fetch error
