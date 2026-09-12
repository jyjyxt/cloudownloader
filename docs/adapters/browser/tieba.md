# Tieba

**Mode**: 🔐 Browser · **Domain**: `tieba.baidu.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl tieba hot` | Read Tieba trending topics |
| `cloudl tieba posts <forum>` | List threads in one forum |
| `cloudl tieba search <keyword>` | Search threads across Tieba |
| `cloudl tieba read <thread-id>` | Read one thread page |

## Usage Examples

```bash
# Trending topics
cloudl tieba hot --limit 5

# List forum threads
cloudl tieba posts 李毅 --limit 10

# Search Tieba
cloudl tieba search 编程 --limit 10

# Read one thread
cloudl tieba read 10163164720 --limit 10

# Read page 2 of a thread
cloudl tieba read 10163164720 --page 2 --limit 10

# JSON output
cloudl tieba hot -f json
```

## Notes

- `tieba search` currently supports only `--page 1`
- `tieba read --limit` counts reply rows; page 1 may also include the main post

## Prerequisites

- Chrome running and able to open `tieba.baidu.com`
- [Browser Bridge extension](/guide/browser-bridge) installed
- For `posts`, `search`, and `read`, a valid Tieba login session in Chrome is recommended
