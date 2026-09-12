# BBC News

**Mode**: 🌐 Public · **Domain**: `bbc.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl bbc news` | Latest BBC News headlines (top stories) |
| `cloudl bbc topic <topic>` | Latest headlines for a single BBC topic feed |

## Usage Examples

```bash
# Top stories
cloudl bbc news --limit 5

# Topic-scoped feeds (RSS at feeds.bbci.co.uk/news/<topic>/rss.xml)
cloudl bbc topic technology --limit 10
cloudl bbc topic world --limit 20
cloudl bbc topic business
cloudl bbc topic science_and_environment

# JSON output
cloudl bbc topic technology -f json
```

## Topics

Valid `<topic>` values:

| Topic slug | Feed |
|------------|------|
| `world` | World news |
| `business` | Business |
| `politics` | UK politics |
| `health` | Health |
| `education` | Education & family |
| `science_and_environment` | Science & environment |
| `technology` | Technology |
| `entertainment_and_arts` | Entertainment & arts |

Pass any other value and the adapter raises `ArgumentError` with the full list.

## Output Columns

| Command | Columns |
|---------|---------|
| `news` | (see existing news row schema) |
| `topic` | `rank, title, description, pubDate, url` |

## Prerequisites

- No browser required — uses the public BBC RSS feeds at `feeds.bbci.co.uk`.
