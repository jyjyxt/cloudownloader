# Xiaohongshu video publishing / 小红书视频发布

`cloudl xiaohongshu publish-video metadata.json` uploads a video and fills its title/body, without publishing by default. Metadata requires `video`, `account`, `title` (1–20 characters) and `content` (1–1000 characters). Text/language is preserved exactly.

```sh
cloudl xiaohongshu publish-video metadata.json --session xhs-upload
# After inspecting the prepared video, metadata and saved cover:
cloudl xiaohongshu publish-video metadata.json --session xhs-upload --resume --execute
```

## Cover / 封面

Custom image upload/cropping is performed in the platform editor after preparation. Use a platform-appropriate crop (often 3:4), then save and inspect every headline and subject. Optionally add `cover_url` with the exact HTTPS URL from the saved `img.cover` preview before resuming. A mismatched, undecoded or still-open cover editor blocks submission. Preserve the query string. URL equality verifies the saved selection, not visual readability; inspect the preview separately.

`cover` file paths are rejected because this adapter does not upload them. A loading editor or disabled completion button is an unresolved platform state, not a successful save. Do not force-enable the button, alter editor internals or repeatedly re-upload the video. Keep the prepared session for inspection and recovery.

自定义封面先在准备后的平台编辑器上传、裁切并保存，再核对标题与主体完整。可选 `cover_url` 核对已保存的实际预览地址；本命令不自动上传 `cover` 文件，传入该字段会报错。预览无法解码、地址不符或编辑器未关闭时不会发布。

## Receipt / 回执

The command writes `metadata.json.state.json`. It persists `submitting` before the one submission attempt. Transport failures or ambiguous acknowledgements leave that state and block retries across processes; inspect `cloudl xiaohongshu creator-notes` before reconciling it. A confirmed `published` receipt is returned without another upload or click. Changing metadata/video after publication is rejected. Retain receipts with their original metadata.

Metadata and named-session locks cover preparation through confirmation, preventing simultaneous commands from overwriting one another's pending receipts. Locks left by a terminated process require checking that no publisher is active before removal; lock age is not treated as proof that a publisher has stopped. Success must be visible standalone platform feedback outside the note editor; the same words in the body never confirm publication.

提交前落盘 `submitting`，结果不明时保留该状态并阻止重试；通过创作者笔记列表核对后再处理记录。确认成功的回执直接返回，不重复提交。上传或“准备完成”不等于已发表。元数据和浏览器会话双锁防止并发覆盖回执；异常退出后先核对没有活动发布进程，再清理残留锁。成功提示必须是正文编辑区域外的可见独立平台反馈，正文中出现“发布成功”不算确认。

## Implementation contract

Strategy: `UI_SELECTOR`; contract: `visible-ui`. Existing video input, title placeholder, ProseMirror body and publish readiness remain the production path. Cover verification reads the visible saved preview; it does not use private upload endpoints or mutate the cover SDK. The disabled cover editor observed during integration is documented as a blocker, not a supported bypass. Automated tests exercise receipt recovery and form/cover checks without posting another real video.
