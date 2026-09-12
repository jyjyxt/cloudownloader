# Gitee

**Mode**: 🌐 Public (Browser) · **Domain**: `gitee.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl gitee trending` | Recommended open-source projects from Gitee Explore |
| `cloudl gitee search` | Search Gitee repositories by keyword |
| `cloudl gitee user` | Show user profile panel (nickname, followers, public repos, Gitee index) |

## Usage Examples

```bash
# Explore recommended projects
cloudl gitee trending --limit 10

# Search repositories
cloudl gitee search cloudl --limit 10

# User profile panel
cloudl gitee user fu-qingrong

# JSON output
cloudl gitee trending --limit 5 -f json
cloudl gitee search "ai agent" --limit 5 -f json
cloudl gitee user jackwener -f json
```

## Prerequisites

- Chrome running with [Browser Bridge extension](/guide/browser-bridge) installed
- No login required for these public commands
