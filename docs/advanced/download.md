# Download Support

OpenCLI supports downloading images, videos, and articles from supported platforms.

## Supported Platforms

| Platform | Content Types | Notes |
|----------|---------------|-------|
| **xiaohongshu** | Images, Videos | Downloads all media from a note |
| **bilibili** | Videos | Requires `yt-dlp` installed |
| **twitter** | Images, Videos | Downloads from user media tab or single tweet |
| **douban** | Images | Downloads poster / still image lists from movie subjects |
| **xiaoyuzhou** | Audio, Transcript | Downloads episode audio and transcript JSON/text with local credentials |
| **zhihu** | Articles (Markdown) | Exports articles with optional image download |
| **weixin** | Articles (Markdown) | Exports WeChat Official Account articles |
| **midjourney** | Images, Raw/Social Video, GIF | Validates file signatures; requires a logged-in browser |

## Prerequisites

For video downloads from streaming platforms, install `yt-dlp`:

```bash
# Install yt-dlp
pip install yt-dlp
# or
brew install yt-dlp
```

## Usage Examples

```bash
# Download images/videos from Xiaohongshu note
cloudl xiaohongshu download "https://www.xiaohongshu.com/search_result/<id>?xsec_token=..." --output ./xhs
cloudl xiaohongshu download "https://xhslink.com/..." --output ./xhs

# Download Bilibili video (requires yt-dlp)
cloudl bilibili download --bvid BV1xxx --output ./bilibili
cloudl bilibili download --bvid BV1xxx --quality 1080p

# Download Twitter media from user
cloudl twitter download elonmusk --limit 20 --output ./twitter

# Download single tweet media
cloudl twitter download --tweet-url "https://x.com/user/status/123" --output ./twitter

# Download Douban posters / stills
cloudl douban download 30382501 --output ./douban

# Download Xiaoyuzhou episode audio
cloudl xiaoyuzhou download 69b3b675772ac2295bfc01d0 --output ./xiaoyuzhou

# Download Xiaoyuzhou transcript JSON + text
cloudl xiaoyuzhou transcript 69dd0c98e2c8be31551f6a33 --output ./xiaoyuzhou-transcripts

# Export Zhihu article to Markdown
cloudl zhihu download "https://zhuanlan.zhihu.com/p/xxx" --output ./zhihu

# Export with local images
cloudl zhihu download "https://zhuanlan.zhihu.com/p/xxx" --download-images

# Export WeChat article to Markdown
cloudl weixin download --url "https://mp.weixin.qq.com/s/xxx" --output ./weixin

# Download all four Midjourney image candidates or a social-ready video
cloudl midjourney download <image-job> --kind image --index all --output ./midjourney
cloudl midjourney download <video-job> --kind video-social --index 1 --output ./midjourney
```

`cloudl xiaoyuzhou download` and `transcript` require local Xiaoyuzhou credentials in `~/.opencli/xiaoyuzhou.json`.

## Pipeline Step

The `download` step can be used in pipeline adapters:

::: v-pre
```yaml
pipeline:
  - fetch: https://api.example.com/media
  - download:
      url: ${{ item.imageUrl }}
      dir: ./downloads
      filename: ${{ item.title | sanitize }}.jpg
      concurrency: 5
      skip_existing: true
```
:::
