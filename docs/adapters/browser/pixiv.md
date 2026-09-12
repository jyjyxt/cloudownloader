# Pixiv

**Mode**: 🔐 Browser · **Domain**: `www.pixiv.net`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl pixiv ranking` | Daily/weekly/monthly illustration rankings |
| `cloudl pixiv search <query>` | Search illustrations by keyword or tag |
| `cloudl pixiv user <uid>` | View artist profile info |
| `cloudl pixiv me` | Show the currently logged-in Pixiv account |
| `cloudl pixiv illusts <user-id>` | List illustrations by artist |
| `cloudl pixiv detail <id>` | View illustration details |
| `cloudl pixiv download <illust-id>` | Download original-quality images |
| `cloudl pixiv novel <id>` | View novel metadata |
| `cloudl pixiv novel-download <novel-id>` | Download novel text as txt or markdown |
| `cloudl pixiv novels <user-id>` | List novels by user |
| `cloudl pixiv bookmarks` | List current-account illustration or novel bookmarks |
| `cloudl pixiv bookmark-download` | Batch download current-account bookmarks |

## Output Columns

| Command | Columns |
|---------|---------|
| `ranking` | `rank, title, author, user_id, illust_id, pages, bookmarks, url` |
| `search` | `rank, title, author, user_id, illust_id, pages, bookmarks, tags, url` |
| `illusts` | `rank, title, illust_id, pages, bookmarks, tags, created, url` |
| `user` | `user_id, name, premium, following, illusts, manga, novels, comment, url` |
| `me` | `user_id, name, premium, profile_image, url` |
| `detail` | `illust_id, title, author, type, pages, bookmarks, likes, views, tags, created, url` |
| `novel` | `novel_id, title, author, user_id, series_id, series_title, series_order, words, characters, bookmarks, likes, views, tags, created, url` |
| `novel-download` | `novel_id, title, format, status, path` |
| `novels` | `rank, title, novel_id, words, characters, bookmarks, tags, created, url` |
| `bookmarks` | `rank, type, bookmark_owner_id, title, author, user_id, illust_id, novel_id, pages, words, bookmarks, tags, created, url` |
| `bookmark-download` | `rank, type, id, title, download_status, path` |

`illust_id` round-trips from `ranking` / `search` / `illusts` into `detail` / `download`. `novel_id` round-trips from `novels` / `bookmarks` into `novel` / `novel-download`. `user_id` round-trips from `ranking` / `search` into `user` / `illusts` / `novels`; `bookmark_owner_id` identifies the authenticated account whose bookmark endpoint was read.

## Usage Examples

### Ranking

```bash
# Daily rankings (default)
cloudl pixiv ranking --limit 10

# Weekly / monthly rankings
cloudl pixiv ranking --mode weekly
cloudl pixiv ranking --mode monthly

# R18 rankings
cloudl pixiv ranking --mode daily_r18
cloudl pixiv ranking --mode weekly_r18

# Other modes: rookie, original, male, female
cloudl pixiv ranking --mode rookie
```

### Search

```bash
# Search by keyword or tag
cloudl pixiv search "初音ミク" --limit 20

# Filter by content rating
cloudl pixiv search "風景" --mode safe       # Safe-for-work only
cloudl pixiv search "風景" --mode r18        # R18 only
cloudl pixiv search "風景" --mode all        # All (default)

# Sort by popularity
cloudl pixiv search "VOCALOID" --order popular_d

# All sort options: date_d (newest), date (oldest), popular_d, popular_male_d, popular_female_d

# Pagination
cloudl pixiv search "オリジナル" --page 2 --limit 30
```

### User & Illustrations

```bash
# View artist profile
cloudl pixiv user 11

# Show the currently logged-in account
cloudl pixiv me

# List artist's illustrations (newest first)
cloudl pixiv illusts 11 --limit 10

# View illustration details (tags, stats, type)
cloudl pixiv detail 12345678
```

### Novels

```bash
# View novel metadata
cloudl pixiv novel 10588915

# Download novel text
cloudl pixiv novel-download 10588915 --file-format txt --execute
cloudl pixiv novel-download 10588915 --file-format md --output ./my-novels --execute

# List a user's novels (newest first)
cloudl pixiv novels 37119297 --limit 10

```

Novel commands expose metadata, IDs, tags, series fields, and stats. They do not emit the full novel body text.
Use `novel-download` when you explicitly want to export the novel body text to a local file.
Local download commands require `--execute`, reject existing targets and symbolic-link output roots, and remove files created by a failed batch.

### Current-account bookmarks

```bash
# List current account's public illustration bookmarks
cloudl pixiv bookmarks --type illust --limit 20

# List current account's private novel bookmarks
cloudl pixiv bookmarks --type novel --visibility hide --limit 20

# Batch download current account illustration bookmarks
cloudl pixiv bookmark-download --type illust --limit 100 --output ./pixiv-archive --execute

# Batch download current account novel bookmarks as Markdown
cloudl pixiv bookmark-download --type novel --limit 100 --file-format md --output ./pixiv-archive --execute
```

### Download

```bash
# Download all images from an illustration
cloudl pixiv download 12345678

# Download to a custom directory
cloudl pixiv download 12345678 --output ./my-images
```

### Output Formats

```bash
# JSON output
cloudl pixiv ranking -f json

# Verbose mode
cloudl pixiv search "test" -v
```

## Prerequisites

- Chrome running and **logged into** pixiv.net
- [Browser Bridge extension](/guide/browser-bridge) installed
