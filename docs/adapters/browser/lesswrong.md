# LessWrong

**Mode**: Public · **Domain**: `www.lesswrong.com`

Rationality community and AI alignment research forum.

## Commands

| Command | Description |
|---------|-------------|
| `cloudl lesswrong curated` | Editor's picks |
| `cloudl lesswrong frontpage` | Algorithmic frontpage feed |
| `cloudl lesswrong new` | Latest posts |
| `cloudl lesswrong top` | Top rated (all time) |
| `cloudl lesswrong top-week` | Top rated this week |
| `cloudl lesswrong top-month` | Top rated this month |
| `cloudl lesswrong top-year` | Top rated this year |
| `cloudl lesswrong read` | Read full post by URL or ID |
| `cloudl lesswrong comments` | Top comments on a post |
| `cloudl lesswrong user` | User profile |
| `cloudl lesswrong user-posts` | List a user's posts |
| `cloudl lesswrong tag` | Posts by tag |
| `cloudl lesswrong tags` | List popular tags |
| `cloudl lesswrong sequences` | Post collections |
| `cloudl lesswrong shortform` | Quick takes |

## Usage Examples

```bash
# Browse curated posts
cloudl lesswrong curated --limit 5

# Top posts this week
cloudl lesswrong top-week --limit 10

# Read a specific post
cloudl lesswrong read CzoiqGzpShprcv2Jd
cloudl lesswrong read https://www.lesswrong.com/posts/xxx/slug

# Posts tagged "AI"
cloudl lesswrong tag ai --limit 5

# User profile and posts
cloudl lesswrong user zvi
cloudl lesswrong user-posts zvi --limit 5

# Comments on a post
cloudl lesswrong comments CzoiqGzpShprcv2Jd --limit 10

# JSON output
cloudl lesswrong curated -f json
```

## Prerequisites

- No browser required — uses public LessWrong GraphQL API
