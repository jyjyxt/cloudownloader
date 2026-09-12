# HackerNews

**Mode**: 🌐 Public · **Domain**: `news.ycombinator.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl hackernews top` | Hacker News top stories |
| `cloudl hackernews new` | Hacker News newest stories |
| `cloudl hackernews best` | Hacker News best stories |
| `cloudl hackernews ask` | Hacker News Ask HN posts |
| `cloudl hackernews show` | Hacker News Show HN posts |
| `cloudl hackernews jobs` | Hacker News job postings |
| `cloudl hackernews search <query>` | Search Hacker News stories |
| `cloudl hackernews user <username>` | Hacker News user profile |
| `cloudl hackernews read <id>` | Read a story and its comment tree |

## Usage Examples

```bash
# Top stories
cloudl hackernews top --limit 5

# Newest stories
cloudl hackernews new --limit 10

# Search stories
cloudl hackernews search "machine learning" --limit 5

# User profile
cloudl hackernews user pg

# JSON output
cloudl hackernews top -f json

# Sort search by date
cloudl hackernews search "rust" --sort date

# Read a story and its top comments (id from any listing's `id` column)
cloudl hackernews read 47999636 --limit 5 --depth 2
```

## Prerequisites

- No browser required — uses public API
