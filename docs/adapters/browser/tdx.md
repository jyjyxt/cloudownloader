# TDX

**Mode**: 🔐 Browser · **Domain**: `pul.tdx.com.cn`

Access 通达信 (TDX) hot-search stock ranking from the terminal.

## Commands

| Command | Description |
|---------|-------------|
| `cloudl tdx hot-rank` | 通达信热搜榜 (TDX hot-search ranking) |

## Usage Examples

```bash
# Top 20 trending searches (default)
cloudl tdx hot-rank

# Top 50 trending searches
cloudl tdx hot-rank --limit 50

# JSON output
cloudl tdx hot-rank -f json
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--limit` | `20` | 返回数量 (number of rows to return) |

## Output Columns

`rank` · `symbol` · `name` · `changePercent` · `heat` · `tags`

## Prerequisites

- Chrome extension installed and connected
- Visit `pul.tdx.com.cn` once in the browser so cookies are populated
