# Juejin

**Mode**: 🌐 Public · **Domain**: `api.juejin.cn`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl juejin recommend` | Juejin (掘金) homepage recommended article feed |
| `cloudl juejin hot` | Juejin (掘金) hot article ranking, optionally scoped to a category |

## Usage Examples

```bash
# Front-page recommendation feed
cloudl juejin recommend --limit 10

# Paginate the feed with the next-page cursor returned in the previous batch
cloudl juejin recommend --cursor "1718900000000000000" --limit 10

# Hot ranking, default backend category
cloudl juejin hot --limit 20

# Hot ranking scoped to AI / frontend
cloudl juejin hot --category ai --limit 10
cloudl juejin hot --category frontend --limit 10

# Hot ranking by raw category id (the API returned id)
cloudl juejin hot --category 6809637773935378440 --limit 5

# JSON output
cloudl juejin hot -f json
```

### `recommend` Options

| Option | Description |
|--------|-------------|
| `--limit` | Max articles (1-100, default 20) |
| `--cursor` | Pagination cursor; pass back the previous response's cursor to keep scrolling (default "0") |

Returns rows with `rank, article_id, title, brief, views, likes, comments, author, tags, url, next_cursor, has_more`. The `article_id` round-trips into `https://juejin.cn/post/<id>`. Use `next_cursor` as the next `--cursor` value when `has_more` is `true`.

### `hot` Options

| Option | Description |
|--------|-------------|
| `--category` | Category slug or numeric id. Slugs: `backend`, `frontend`, `android`, `ios`, `ai` (default backend) |
| `--limit` | Max articles (1-50, default 20) |

Returns rows with `rank, article_id, title, brief, views, likes, comments, hot_rank, author, url`.

## Prerequisites

- No browser required; uses public Juejin API endpoints.
