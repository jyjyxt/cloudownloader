# Weibo (微博)

**Mode**: 🔐 Browser · **Domain**: `weibo.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl weibo hot` | 微博热搜 |
| `cloudl weibo search` | Search Weibo posts by keyword |
| `cloudl weibo feed` | 首页时间线（`for-you` / `following`） |
| `cloudl weibo user` | 用户信息 |
| `cloudl weibo user-posts` | 按用户列出微博，可选日期范围 |
| `cloudl weibo me` | 我的信息 |
| `cloudl weibo post` | 读取单条微博 |
| `cloudl weibo favorites` | 我的微博收藏列表 |
| `cloudl weibo publish` | 通过网页 UI 直接发布微博，支持最多 9 张图片 |
| `cloudl weibo delete` | 删除登录账号自己的单条微博 |
| `cloudl weibo comments` | 微博评论 |

## Usage Examples

```bash
# Quick start
cloudl weibo hot --limit 5

# JSON output
cloudl weibo hot -f json

# Search
cloudl weibo search "OpenAI" --limit 5

# Home timeline (default: for-you / 推荐流)
cloudl weibo feed --limit 10

# Following-only timeline (strict chronological following feed)
cloudl weibo feed --type following --limit 10

# Read a post from feed/search using the emitted id
cloudl weibo post <id>

# List a user's posts by uid or screen name
cloudl weibo user-posts 1670458304 --start 2025-06-01 --end 2025-06-02 --limit 20

# Verbose mode
cloudl weibo hot -v

# Favorites
cloudl weibo favorites --limit 20

# Publish text (executes immediately)
cloudl weibo publish "Hello from OpenCLI"

# Publish text with images (executes immediately)
cloudl weibo publish "Hello with images" --images /path/a.jpg,/path/b.png

# Delete one of your own posts (executes immediately)
cloudl weibo delete <id>
```

## Listing Columns

`feed`, `search`, and `user-posts` expose `id` for post rows. Pass that value
directly to `cloudl weibo post <id>`. `hot` rows are search topics, not post
rows.

## Prerequisites

- Chrome running and **logged into** weibo.com
- [Browser Bridge extension](/guide/browser-bridge) installed
