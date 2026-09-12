# 微信读书 (WeRead)

**Mode**: 🔐 Browser · **Domain**: `weread.qq.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl weread shelf` | List books on your bookshelf |
| `cloudl weread search` | Search books on WeRead |
| `cloudl weread book` | View book details |
| `cloudl weread ranking` | Book rankings by category |
| `cloudl weread notebooks` | List books that have highlights or notes |
| `cloudl weread highlights` | List your highlights (underlines) in a book |
| `cloudl weread notes` | List your notes (thoughts) on a book |

## Usage Examples

```bash
# View your bookshelf
cloudl weread shelf --limit 20

# Search books
cloudl weread search "三体"

# View book details
cloudl weread book <book-id>

# Book rankings
cloudl weread ranking --limit 10

# List books with notes/highlights
cloudl weread notebooks

# View highlights for a book
cloudl weread highlights <book-id>

# View your notes
cloudl weread notes <book-id>

# JSON output
cloudl weread shelf -f json
```

## Prerequisites

- Chrome running and **logged into** weread.qq.com
- [Browser Bridge extension](/guide/browser-bridge) installed
