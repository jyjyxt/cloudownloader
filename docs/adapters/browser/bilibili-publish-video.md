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

The command writes `metadata.json.state.json` next to the metadata. A confirmed receipt is returned without re-posting. An uncertain submission blocks retries, including after metadata edits. Inspect the creator content manager before manually reconciling that state file. A `submitted` result means the platform acknowledged submission; it does not mean moderation has completed. The current acknowledgement `稿件投递成功` is recognized. A BV link is returned when present on the success page.

## Custom cover preview

Custom image upload/cropping is performed in the platform editor after preparing the video. Check both the 16:9 and 4:3 previews for complete text and subjects. Once saved, optionally set `cover_url` to the exact HTTPS URL in `.cover-main .cover-img`'s background image and run `--resume --execute`; the command refuses a different preview. Keep the URL's query string intact. A local `cover` file path is rejected explicitly because this command does not upload that file. The default `cover_index` only chooses a recommended video frame. A matching URL verifies the saved selection, not crop readability; inspect the actual preview before submission.

## 中文说明

命令原样保留中文标题和简介，不自动翻译。当前“稿件投递成功”返回 `submitted`，并不代表审核通过。自定义封面先在准备后的平台编辑器上传、裁切并保存，检查 16:9 与 4:3 预览；可用 `cover_url` 指定已保存预览的完整 HTTPS 地址，续传时核对一致。`cover` 文件路径会明确报错，不再被静默忽略。提交结果不明确时先核对稿件管理，不重复投稿。成功提示必须是编辑区域外的可见独立反馈，简介中出现相同文字不算提交成功。元数据和浏览器会话双锁防止并发提交；进程异常退出留下锁时，先核对没有活动发布进程，再清理锁文件，不能仅按锁的存在时长自动解锁。

The command relies on the creator center's visible UI selectors (verified 2026-09-19); login prompts, verification challenges, or UI changes may require manual intervention.

Submission acknowledgement is read from visible standalone platform feedback outside editable metadata; words in the description are not a successful submission. Metadata and browser-session locks prevent concurrent preparation/submission. If a terminated process leaves a lock, check for an active publisher before removing it; elapsed time alone does not prove the process stopped.
