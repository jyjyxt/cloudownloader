# 即刻 (Jike)

**Mode**: 🔐 Browser · **Domain**: `web.okjike.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl jike feed` | 即刻首页动态流 |
| `cloudl jike search` | 搜索即刻帖子 |
| `cloudl jike post` | 帖子详情及评论 |
| `cloudl jike topic` | 话题详情 |
| `cloudl jike user` | 用户资料 |
| `cloudl jike create` | 发布即刻动态 |
| `cloudl jike comment` | 评论即刻帖子 |
| `cloudl jike like` | 点赞即刻帖子 |
| `cloudl jike repost` | 转发即刻帖子 |
| `cloudl jike notifications` | 即刻通知 |

## Usage Examples

```bash
# View feed
cloudl jike feed --limit 10

# Search posts
cloudl jike search "AI" --limit 20

# View post details and comments
cloudl jike post <post-id>

# Create a new post
cloudl jike create --content "Hello Jike!"

# Like a post
cloudl jike like <post-id>

# JSON output
cloudl jike feed -f json
```

## Listing Columns

`feed`, `search`, and `user` expose `id` for each post row. Pass that value
directly to `cloudl jike post <id>` for the detail view.

## Prerequisites

- Chrome running and **logged into** web.okjike.com
- [Browser Bridge extension](/guide/browser-bridge) installed
