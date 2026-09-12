# 牛客网 (Nowcoder)

**Mode**: 🌐 / 🔐 · **Domain**: `nowcoder.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl nowcoder hot` | Hot search ranking |
| `cloudl nowcoder trending` | Trending posts |
| `cloudl nowcoder topics` | Hot discussion topics |
| `cloudl nowcoder recommend` | Recommended feed |
| `cloudl nowcoder creators` | Top content creators leaderboard |
| `cloudl nowcoder companies` | Hot companies for interview prep |
| `cloudl nowcoder jobs` | Career category listing |
| `cloudl nowcoder search <query>` | Search content and moment posts (type: post/all; default: post) |
| `cloudl nowcoder suggest <query>` | Search suggestions |
| `cloudl nowcoder experience` | Interview experience posts |
| `cloudl nowcoder referral` | Internal referral posts |
| `cloudl nowcoder salary` | Salary disclosure posts |
| `cloudl nowcoder papers` | Interview question bank by company & job |
| `cloudl nowcoder practice` | Categorized practice questions with progress |
| `cloudl nowcoder notifications` | Unread message summary |
| `cloudl nowcoder detail <id>` | Content or moment detail (numeric ID, UUID, or canonical URL) |

## Usage Examples

```bash
# Hot search ranking
cloudl nowcoder hot --limit 10

# Search for interview experiences
cloudl nowcoder search "bilibili" --type post --limit 5

# Search suggestions
cloudl nowcoder suggest "java"

# Browse interview experience posts
cloudl nowcoder experience --limit 10

# View a specific post detail (use the ID or URL returned by list commands)
cloudl nowcoder detail 912885704667987968

# Interview question bank for Java at Huawei
cloudl nowcoder papers --job 11002 --company 239

# Practice questions for software development
cloudl nowcoder practice --job 11226 --limit 10

# Hot companies for C++ positions
cloudl nowcoder companies --job 11003

# JSON output
cloudl nowcoder trending -f json

# Verbose mode
cloudl nowcoder hot -v
```

## Prerequisites

- **Public commands** (hot, trending, topics, recommend, creators, companies, jobs): No login required
- **Cookie commands** (all others): Chrome running and **logged into** nowcoder.com, [Browser Bridge extension](/guide/browser-bridge) installed

## Post identity

Nowcoder post feeds contain two distinct entities. `search` and `experience` identify them from the service's `contentType` discriminator and return `post_type`, a round-trippable `id`, `uuid`, `entity_id`, canonical `url`, stable author fields, and the entity's creation time.

- `content` uses a numeric `id`, `/discuss/<id>`, the content-data detail endpoint, and `createTime`.
- `moment` uses its 32-character UUID as `id`, `/feed/main/detail/<uuid>`, the moment-data detail endpoint, and `createdAt`.

Pass the returned `id` or `url` to `nowcoder detail`. A content UUID is metadata and is not a valid `/discuss/` identifier; a moment's numeric `entity_id` is not accepted by the moment detail endpoint.
