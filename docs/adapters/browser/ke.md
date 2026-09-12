# Ke

**Mode**: 🔐 Browser · **Domain**: `ke.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl ke ershoufang` | Browse second-hand housing listings |
| `cloudl ke zufang` | Browse rental listings |
| `cloudl ke xiaoqu` | Browse neighborhood / community listings |
| `cloudl ke chengjiao` | Browse recent transaction records |

## Usage Examples

```bash
# Beijing second-hand housing
cloudl ke ershoufang --city bj --district chaoyang --limit 10

# Rentals in Shanghai
cloudl ke zufang --city sh --district pudong --max-price 8000 --limit 10

# Communities in Guangzhou
cloudl ke xiaoqu --city gz --district tianhe --limit 10

# Recent transactions in Beijing Haidian
cloudl ke chengjiao --city bj --district haidian --limit 10
```

## Prerequisites

- Chrome running and logged into `ke.com`
- [Browser Bridge extension](/guide/browser-bridge) installed

## Notes

- `city` uses short city codes such as `bj`, `sh`, `gz`, `sz`
- `district` expects the district slug used in Beike URLs, for example `chaoyang` or `haidian`
