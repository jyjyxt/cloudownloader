# Bilibili

**Mode**: 🔐 Browser · **Domain**: `bilibili.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl bilibili hot` | |
| `cloudl bilibili search` | |
| `cloudl bilibili me` | |
| `cloudl bilibili favorite` | Read your first favorite folder, or a specific folder with `--fid` |
| `cloudl bilibili history` | |
| `cloudl bilibili feed` | Read the following feed, or a specific user's dynamics by uid/name |
| `cloudl bilibili feed-detail` | Read one dynamic in detail, including exclusive content |
| `cloudl bilibili subtitle` | |
| `cloudl bilibili video` | Get one video's metadata (title, author, duration, stats) by BV / URL / b23.tv link |
| `cloudl bilibili summary` | Get the official AI video summary and timestamped outline by BV / URL / b23.tv link |
| `cloudl bilibili comments` | Read top-level comments; `--parent` reads replies under a comment, `--top` reads only pinned comments |
| `cloudl bilibili comment` | Post a top-level comment or reply under a top-level comment (requires `--execute`) |
| `cloudl bilibili dynamic` | |
| `cloudl bilibili ranking` | |
| `cloudl bilibili following` | |
| `cloudl bilibili follow` | Follow a user by UID, profile URL, or resolvable name; verifies the relation after modify |
| `cloudl bilibili unfollow` | Unfollow a user by UID, profile URL, or resolvable name; verifies the relation after modify |
| `cloudl bilibili user-videos` | |
| `cloudl bilibili download` | |
| `cloudl bilibili creator-stats <bvid-or-video-url>` | Read a curated manuscript-level metric snapshot from the latest creator-center comparison rows |

## Usage Examples

```bash
# Quick start
cloudl bilibili hot --limit 5

# Search videos
cloudl bilibili search 黑神话 --limit 10

# Read one creator's videos
cloudl bilibili user-videos 2 --limit 10

# Follow / unfollow a creator
cloudl bilibili follow 9617619
cloudl bilibili unfollow https://space.bilibili.com/9617619

# Read your first favorite folder
cloudl bilibili favorite --limit 10

# Read a specific favorite folder
cloudl bilibili favorite --fid 123456789 --limit 10

# Read following feed
cloudl bilibili feed --limit 10

# Read one user's dynamics by UID
cloudl bilibili feed 2 --limit 10

# Read one user's dynamics by username and paginate
cloudl bilibili feed 老番茄 --pages 2 --type video

# Read one dynamic in detail
cloudl bilibili feed-detail 1234567890123456789

# Fetch subtitles
cloudl bilibili subtitle BV1xx411c7mD --lang zh-CN

# Inspect one video's metadata
cloudl bilibili video BV1xx411c7mD
cloudl bilibili video https://www.bilibili.com/video/BV1xx411c7mD/

# Read normalized creator-center metrics for a recent manuscript
cloudl bilibili creator-stats "$BVID_OR_VIDEO_URL" -f json

# Fetch the official AI summary for a video
cloudl bilibili summary BV1xx411c7mD
cloudl bilibili summary https://www.bilibili.com/video/BV1xx411c7mD/

# Read comments and a reply thread under a top-level rpid
cloudl bilibili comments BV1xx411c7mD --limit 10
cloudl bilibili comments BV1xx411c7mD --parent 123456789 --limit 10

# Read only the pinned (置顶) comments
cloudl bilibili comments BV1xx411c7mD --top

# Post a comment or reply. The write only happens with --execute.
cloudl bilibili comment BV1xx411c7mD "这条评论来自 Cloudl" --execute
cloudl bilibili comment BV1xx411c7mD "回复楼主" --parent 123456789 --execute

# JSON output
cloudl bilibili hot -f json

# Verbose mode
cloudl bilibili hot -v
```

## Prerequisites

- Chrome running and **logged into** bilibili.com
- [Browser Bridge extension](/guide/browser-bridge) installed

## Notes

- `cloudl bilibili feed` without `uid` reads your following feed
- `cloudl bilibili feed <uid-or-name>` reads a specific user's dynamics
- `cloudl bilibili favorite` defaults to the first favorite folder when `--fid` is omitted
- `feed-detail` expects the dynamic ID from a `https://t.bilibili.com/<id>` URL
- `comments` emits `rpid`; pass a top-level row's `rpid` to `comments --parent` to read its reply thread
- `comments --limit` accepts `1..50`; empty comment lists raise `EmptyResultError`
- `comments --top` returns only pinned comments (from the API's `top_replies`); it cannot be combined with `--parent`, and a video with no pinned comment raises `EmptyResultError`
- `comment` is a write command and refuses to post unless `--execute` is passed
- `comment --parent` expects the top-level/root `rpid`; nested reply-to-reply targeting is not inferred
- `follow` and `unfollow` are write commands; they no-op when the current relation already matches the requested state and otherwise re-read `/x/relation` after modify before reporting success
- `follow` and `unfollow` accept numeric UID, exact `space.bilibili.com/<uid>` profile URL, or a name that resolves through Bilibili search
- `creator-stats` uses the logged-in creator-center session and searches the comparison endpoint's latest 100 manuscript rows. A missing BVID is reported as empty because it may be older, not owned by this account, or not analyzed yet; absence does not prove an ownership or login failure.
- The command emits a fixed manuscript-level metric family as `{ bvid, metric, value, unit }`. Counts use `count`, duration uses `seconds`, and documented basis-point rates are normalized to `percent` in the 0–100 range. A `null` value means that individual metric has not been generated yet.
- The comparison endpoint is undocumented and treated as an internal, unstable contract: missing or malformed required fields fail closed instead of silently changing the output schema. The command does not claim per-part retention analytics.
