# Wikipedia

**Mode**: 🌐 Public · **Domain**: `wikipedia.org`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl wikipedia search` | Search Wikipedia articles |
| `cloudl wikipedia summary` | Get Wikipedia article summary |
| `cloudl wikipedia random` | Random Wikipedia article |
| `cloudl wikipedia trending` | Trending Wikipedia articles |
| `cloudl wikipedia page <title>` | Full plain-text article extract (optional paragraph cap) |

## Usage Examples

```bash
# Search articles
cloudl wikipedia search "quantum computing" --limit 10

# Get article summary
cloudl wikipedia summary "Artificial intelligence"

# Get the full article body (plain text, no silent truncation)
cloudl wikipedia page "Transformer (deep learning architecture)"

# Cap to first 3 paragraphs explicitly
cloudl wikipedia page "Photosynthesis" --paragraphs 3

# Use with other languages
cloudl wikipedia search "人工智能" --lang zh
cloudl wikipedia page "人工智能" --lang zh --paragraphs 5

# JSON output
cloudl wikipedia search "Rust" -f json
```

## Notes

- `summary` returns the lead-section blurb truncated to 300 chars (legacy convention)
- `page` returns the **complete** plain-text article body. Pass `--paragraphs N` to opt into a cap; default `0` means full article — no silent truncation

## Prerequisites

- No browser required — uses public Wikipedia API
