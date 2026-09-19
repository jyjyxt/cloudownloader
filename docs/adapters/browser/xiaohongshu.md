# Xiaohongshu (小红书)

**Mode**: 🔐 Browser · **Domain**: `xiaohongshu.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl xiaohongshu search` | Search notes by keyword (returns title, author, likes, URL) |
| `cloudl xiaohongshu ask` | Ask 点点 and return its answer with citation sources (`sources[]` in JSON) |
| `cloudl xiaohongshu note` | Read full note content (title, author, description, likes, collects, comments, tags) |
| `cloudl xiaohongshu comments` | Read comments from a note (`--with-replies` for nested 楼中楼 replies) |
| `cloudl xiaohongshu feed` | Home feed recommendations (reads the hydrated Pinia store; URLs carry `xsec_token` for drill-down) |
| `cloudl xiaohongshu notifications` | User notifications (mentions, likes, connections) |
| `cloudl xiaohongshu user` | Get public notes from a user profile |
| `cloudl xiaohongshu saved` | List saved/collected notes (`/user/profile/<id>?tab=fav&subTab=note`) |
| `cloudl xiaohongshu liked` | List liked notes (`/user/profile/<id>?tab=liked&subTab=note`) |
| `cloudl xiaohongshu download` | Download images and videos from a note |
| `cloudl xiaohongshu publish` | Publish image-text notes (creator center UI automation) |
| `cloudl xiaohongshu publish-video` | Upload and prepare a video note; publish once with `--execute`, or resume with `--resume` |
| `cloudl xiaohongshu delete-note` | Verify or delete a published creator-center note by exact note ID |
| `cloudl xiaohongshu follow` | Follow a user from the profile UI and verify the button state flips |
| `cloudl xiaohongshu unfollow` | Unfollow a user from the profile UI, confirm the modal, and verify the button state flips |
| `cloudl xiaohongshu creator-notes` | Creator's note list with per-note metrics |
| `cloudl xiaohongshu creator-note-detail` | Detailed analytics for a single creator note |
| `cloudl xiaohongshu creator-notes-summary` | Combined note list + detail analytics summary |
| `cloudl xiaohongshu creator-profile` | Creator account info (followers, growth level) |
| `cloudl xiaohongshu creator-stats` | Creator data overview (views, likes, collects, trends) |

## Usage Examples

```bash
# Search for notes
cloudl xiaohongshu search 美食 --limit 10

# Combine visible search-panel filters
cloudl xiaohongshu search 美食 --sort latest --note-type video --publish-time week

# Ask 点点 and keep the citation audit trail
cloudl xiaohongshu ask "上海露营需要注意什么？" -f json

# Read a note's full content (pass URL from search results to preserve xsec_token)
cloudl xiaohongshu note "https://www.xiaohongshu.com/search_result/<id>?xsec_token=..."

# Read comments with nested replies (楼中楼)
cloudl xiaohongshu comments "https://www.xiaohongshu.com/search_result/<id>?xsec_token=..." --with-replies --limit 20

# JSON output
cloudl xiaohongshu search 旅行 -f json

# Other commands
cloudl xiaohongshu feed
cloudl xiaohongshu saved --limit 20
cloudl xiaohongshu liked --limit 20
cloudl xiaohongshu saved "https://www.xiaohongshu.com/user/profile/<id>?tab=fav&subTab=note"
cloudl xiaohongshu liked "https://www.xiaohongshu.com/user/profile/<id>?tab=liked&subTab=note"
cloudl xiaohongshu notifications
cloudl xiaohongshu download "https://www.xiaohongshu.com/search_result/<id>?xsec_token=..."
cloudl xiaohongshu download "https://xhslink.com/..."

# Publish an ordinary image-text note
cloudl xiaohongshu publish "正文内容" --title "标题" --images ./a.jpg,./b.png

# Publish a text-image note; split multiple cards with ||| and use \n for card line breaks
cloudl xiaohongshu publish "正文内容" --title "标题" --card-text "第一张\\n第二行|||第二张" --card-style 边框

# Follow / unfollow a profile
cloudl xiaohongshu follow 5d8f88dc0000000001005d3a
cloudl xiaohongshu unfollow https://www.xiaohongshu.com/user/profile/5d8f88dc0000000001005d3a

# Verify a published creator note without deleting it (default dry-run)
cloudl xiaohongshu delete-note 6a08ba0b000000000702a893

# Actually delete after the target row and delete action are verified
cloudl xiaohongshu delete-note 6a08ba0b000000000702a893 --execute
```

### Video publishing

Create a metadata JSON file such as `video-note.json`:

```json
{
  "video": "./video.mp4",
  "title": "视频标题",
  "content": "视频正文",
  "account": "创作者中心显示的账号名称"
}
```

```bash
# Upload and fill the form, waiting for the video to be ready without publishing
cloudl xiaohongshu publish-video ./video-note.json

# Reuse the uploaded video in the same named browser session and publish once
cloudl xiaohongshu publish-video ./video-note.json --resume --execute

# Use a custom session and allow up to 20 minutes for editor/upload readiness
cloudl xiaohongshu publish-video ./video-note.json --session my-video --timeout 1200
```

`video` is resolved relative to the current working directory and must be an existing `.mp4`, `.mov`, or `.m4v` file. The title must contain 1–20 characters and the body 1–1000 characters. The command checks the account name before uploading; `--resume` also checks the uploaded filename. The default session is `xhs-video` and the default readiness timeout is 600 seconds. Publishing requires `--execute`. If submission succeeds but its acknowledgement cannot be confirmed, inspect creator-center notes before retrying.

`search` supports the same visible filter-panel choices as the website: `--sort comprehensive|latest|most-liked|most-commented|most-collected`, `--note-type all|video|image`, `--publish-time anytime|day|week|half-year`, `--scope all|seen|unseen|following`, and `--location all|same-city|nearby`. Account-scoped and location filters fail explicitly when the logged-in browser session lacks the required account or geolocation capability.

> Note: `note` and `comments` now require a full signed note URL with `xsec_token`. `download` accepts either a signed note URL or an `xhslink` short link. Bare note IDs are no longer reliable on xiaohongshu.
> With `comments --with-replies`, `reply_to` is the direct reply target displayed by the page. Replies without an explicit `回复 <name>` marker target the enclosing top-level comment.
> `ask` is separate from ordinary `search`: it submits the question to 点点, returns `answer`, `source_count`, and `sources[]`, and keeps `xsec_token` in JSON when Xiaohongshu returns one. The current 点点 source API may return bare note IDs without `xsec_token`; in that case `url` falls back to `/explore/<note_id>` and `xsec_token` is an empty string. Each source also carries the engagement and identity metadata 点点 returns: `like_count`, `note_type` (`normal`/`video`), `user_id`, and `published_at` (each omitted when 点点 does not provide it), so citation analysis can read likes and note format without a follow-up `search`/`note` round-trip.
> `delete-note` operates in creator center and accepts a 24-character note ID or exact Xiaohongshu note URL; it defaults to dry-run verification and only deletes with `--execute`.
> `follow` and `unfollow` are write commands on the public profile page. They verify the browser stayed on the requested `/user/profile/<id>` target before clicking, and verify the visible follow-state button after the action.
> `publish --card-text` uses creator-center 文字配图. It requires generated card images to appear in the current composer before filling title/body or submitting. If you request `--card-style`, that exact live page style must be selected; unavailable styles fail instead of silently falling back.

## Prerequisites

- Chrome running and **logged into** xiaohongshu.com
- [Browser Bridge extension](/guide/browser-bridge) installed
