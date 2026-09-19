# Bilibili video publishing

`cloudl bilibili publish-video metadata.json` uses the logged-in Chrome session through Cloudl Browser Bridge. It uploads one video, fills metadata, selects a recommended video frame as the cover, replaces automatically suggested tags, waits for upload completion, and verifies the form. By default it only prepares the submission.

```json
{
  "video": "/absolute/path/video.mp4",
  "account": "your Bilibili display name",
  "account_id": "optional numeric account ID",
  "title": "Video title",
  "description": "Description and sources",
  "category": "人工智能",
  "declaration": "内容无需标注",
  "tags": ["人工智能", "AI"],
  "cover_index": 0
}
```

Choose the declaration appropriate to the video. Supported values: 内容无需标注, 含AI生成内容, 含虚构演绎内容, 内容含营销信息, 个人观点，仅供参考. Repost submissions requiring a source field are currently unsupported. This command does not select the optional exclusive-content declaration.

```sh
# Prepare (does not submit)
cloudl bilibili publish-video metadata.json --session bili-upload
# Continue the same upload and submit once
cloudl bilibili publish-video metadata.json --session bili-upload --resume --execute
# Upload and submit in one command
cloudl bilibili publish-video metadata.json --execute
```

Keep the browser session open while uploading. `--resume` requires the same filename and byte size in the session. `--timeout` controls loading/upload waits (default 900 seconds).

The command writes `metadata.json.state.json` next to the metadata. A confirmed receipt is returned without re-posting. An uncertain submission blocks retries, including after metadata edits. Inspect the creator content manager before manually reconciling that state file. A `submitted` result means the platform acknowledged submission; it does not mean moderation has completed. A BV link is returned when present on the success page.

The command relies on the creator center's visible UI selectors (verified 2026-09-19); login prompts, verification challenges, or UI changes may require manual intervention.
