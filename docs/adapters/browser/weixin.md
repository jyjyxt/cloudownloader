# WeChat (微信公众号)

**Mode**: 🌐 / 🔐 Browser · **Domains**: `weixin.sogou.com`, `mp.weixin.qq.com`

## Draft-only boundary

`weixin create-draft` stops after saving to 草稿箱. Use `weixin drafts` to verify the saved title. A draft is not publicly published; the Cloudl Weixin workflow does not click 发表/群发 or start administrator QR verification. Do not continue the workflow with generic `cloudl browser` clicks.

公众号图文只创建并核对草稿；即使需求写“发布到公众号”，当前流程也应明确报告“已保存草稿，未公开发表”。

## Commands

| Command | Description |
|---------|-------------|
| `cloudl weixin search` | 使用搜狗微信搜索公众号文章，返回标题、链接、摘要和发布时间 |
| `cloudl weixin download` | 下载微信公众号文章为 Markdown 格式 |
| `cloudl weixin drafts` | 列出公众号后台草稿箱中的图文草稿 |
| `cloudl weixin create-draft` | 在公众号后台创建新的图文草稿 |

## Usage Examples

```bash
# Search Official Account articles through Sogou Weixin
cloudl weixin search "AI" --page 1 --limit 5

# Export the corresponding WeChat article URL to Markdown
cloudl weixin download --url "https://mp.weixin.qq.com/s/xxx" --output ./weixin

# Export article to Markdown
cloudl weixin download --url "https://mp.weixin.qq.com/s/xxx" --output ./weixin

# Export with locally downloaded images
cloudl weixin download --url "https://mp.weixin.qq.com/s/xxx" --download-images

# Export without images
cloudl weixin download --url "https://mp.weixin.qq.com/s/xxx" --no-download-images

# List the latest drafts
cloudl weixin drafts --limit 5

# Create a draft article
cloudl weixin create-draft --title "周报" --author "Cloudl" --summary "本周更新摘要" "这里是正文内容"

# Create a draft with a cover image sourced from local disk
cloudl weixin create-draft --title "封面示例" --cover-image ./cover.png "正文会先插入图片，再设为封面"

# Create a draft from ordered HTML/text blocks and an independent cover
cat > ./wechat-article.json <<'JSON'
{"cover":"/absolute/path/cover.png","blocks":[{"type":"html","value":"<p>第一段</p>"},{"type":"image","value":"/absolute/path/inline.png"},{"type":"html","value":"<p>第二段</p>"}]}
JSON
cloudl weixin create-draft --title "图文示例" --input ./wechat-article.json
```

## Output

`search` returns one row per Sogou Weixin result:
- `rank` — overall result rank based on the requested page
- `page` — Sogou result page number
- `title` — article title
- `url` — Sogou result link for the article
- `summary` — result-page snippet, when available
- `publish_time` — time text rendered by Sogou, such as `27分钟前` or `2小时前`

Use `weixin download` with the corresponding `mp.weixin.qq.com` article URL when you need Markdown content extraction.

Downloads to `<output>/<article-title>/`:
- `<article-title>.md` — Markdown with frontmatter (title, author, publish time, source URL)
- `images/` — Downloaded images (if `--download-images` is enabled, default: true)

## Prerequisites

- Chrome running and **logged into** mp.weixin.qq.com (for articles behind login wall)
- [Browser Bridge extension](/guide/browser-bridge) installed
- `create-draft` with `--cover-image` requires Browser Bridge file upload support

## Ordered article images and footer

`create-draft` accepts optional text before the pictures, comma-separated `--images`
in article order, and `--footer` text placed after every picture. Omit the positional
content for an image-only article. The first image supplies the cover by default.
If `--cover-image` is supplied with `--images`, it must select a file from that
list and is not uploaded a second time.

```bash
cloudl weixin create-draft --title "Series and parallel circuits" \
  --images ./01.jpg,./02.jpg,./03.jpg --cover-image ./01.jpg \
  --footer "References: OpenStax, University Physics Volume 2, section 10.2"
```

Each upload waits for the CDN image count to increase. Before saving, the adapter
checks the requested image count, exact text, and that the footer follows the
last picture. This still saves a draft only.


## Structured article input

`--input` accepts JSON with a `cover` path and ordered `blocks`. Each block is either `{ "type": "html", "value": "..." }` or `{ "type": "image", "value": "..." }`. Image values may be local paths, `file:` URLs, or HTTP(S) image URLs; remote images are downloaded temporarily before upload. The cover is uploaded for the cover setting and removed from the body before the draft is saved.
