# Preparing video publication

These repository tools prepare platform text/covers and fill an observed form field. They do not upload, submit, or create publication-history reports. Native publisher state files still protect against duplicate submission.

## Metadata and cover preparation

Install the cover dependency into your chosen Python environment with `python3 -m pip install -r scripts/video-publication-requirements.txt`.

Requires Python 3.11+, `ffprobe`, and Pillow when preparing covers. Provide the finished video and caller-owned text in a shared JSON file:

```json
{
  "video": "/absolute/path/full.mp4",
  "account": "your account name",
  "title": "Your video title",
  "description": "Your description and sources",
  "tags": ["Tutorial", "Tools"],
  "category": "知识",
  "bilibili_declaration": "内容无需标注",
  "wechat_declaration": "无需标注",
  "original": false,
  "made_for_kids": false,
  "covers": {
    "portrait": "/absolute/path/portrait-design.png",
    "landscape": "/absolute/path/landscape-design.png"
  }
}
```

Choose content declarations and audience settings appropriate to the video. Relative paths resolve against the input JSON's directory. `platform_text` optionally supplies explicit text for a platform, for example `{"douyin":"Your caption #Topic"}`; otherwise the description is used verbatim. Tags are not automatically appended to descriptions. Omitting `covers` prepares metadata only.

```sh
python3 scripts/prepare-video-publication.py shared.json --output-dir /tmp/video-preparation
```

The tool probes the actual finished video, hashes it, and writes `publish_<platform>.json` for Douyin, Xiaohongshu, WeChat Channels, YouTube and Bilibili. It keeps the text/language, replaces commas with spaces only in the Channels short title, and rejects text exceeding platform limits instead of truncating it. Use `--platforms xiaohongshu bilibili` to prepare a subset.

Cover outputs preserve the source's aspect ratio and full content: `cover_3x4.png` (720×960), `cover_douyin_portrait.png` (1080×1440), `cover_youtube.png` (1280×720), and `cover_bilibili.png` (1440×1080). The Bilibili design sits in the central 16:9 area so the 4:3 and 16:9 crops both retain it. Inspect the actual platform previews; an already clipped source image cannot be restored by resizing.

Existing files require `--overwrite`. Metadata with an existing non-`prepared` publisher state is never overwritten, even with that flag. Choose a new output directory for another video.

Xiaohongshu, Channels and Bilibili metadata does not contain a local `cover` file field: their publishers cannot apply that field. Upload/crop/save the image in the prepared browser session, then set the saved `cover_url` where supported. [Xiaohongshu](../adapters/browser/xiaohongshu-publish-video.md), [Channels](../adapters/browser/wechat-channels-publish-video.md) and [Bilibili](../adapters/browser/bilibili-publish-video.md) document the exact contracts. Douyin has a separate `publish <video>` command; its JSON can also feed the form-filling helper below. YouTube currently requires Cloudl Browser actions in Studio; these files do not introduce a YouTube upload adapter.

## Filling long publication text from JSON

```sh
node scripts/fill-publish-field.mjs /tmp/video-preparation/publish_xiaohongshu.json \
  --session xhs-upload --selector '.tiptap.ProseMirror' --field content --paragraphs

# Explicit workaround for the observed Douyin editor consuming the last character:
node scripts/fill-publish-field.mjs /tmp/video-preparation/publish_douyin.json \
  --session dy-upload --selector '[contenteditable="true"]' --field caption --paragraphs --editor-tail
```

Inspect the page first and use its actual selector. The helper passes text as a process argument, fills once, and reads the actual field. Exact matching is the default. `--paragraphs` permits only rich-editor invisible U+200B caret markers, line-ending/blank-paragraph differences and whitespace around each paragraph; interior text, spaces, punctuation, links and the last word must still match. Input/textarea values remain exact. `--editor-tail` appends a disposable blank line to the input, while verification still compares against the original caption. Missing/repeated characters or ambiguous selectors fail. No publish button is clicked, including after a fill error.

These commands need the same browser-service/network permissions as Cloudl. A sandbox connection failure is not proof that the upload failed. Preserve the prepared session, inspect it, and reconnect before deciding whether to resume. A successful field fill is not a successful publication; confirm the publisher's result without repeating an uncertain submission.

After incorporating local adapter fixes into the repository, back up unique edits and run `cloudl adapter reset <site>` so stale `~/.cloudl/clis/` copies do not hide packaged updates. `cloudl adapter status` shows active overrides.
