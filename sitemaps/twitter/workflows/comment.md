---
schema_version: 1.1
workflow_id: comment
intent: comment on a specific tweet
last_verified: 2026-10-14
source: global
---

## Goal

对指定推文发评论，保留原文的多段结构、标点和链接，可附本地或远程图片。

## Best path

```bash
cloudl twitter whoami
cloudl twitter comment <tweet-url> "<完整评论正文>" -f json
```

可选 `--image <本地路径>` 或 `--image-url <图片地址>`，两者互斥。多行内容用实际换行并完整引用，不拼接未转义的 shell 字符串。

## Success and re-entry

- 精确填入目标推文的可见编辑框，确认发送按钮启用后只提交一次。
- 新成功回执确认提交；有可信评论地址时返回 `url`，否则为 `null`。
- 输入验证失败表示没有提交；可修正编辑框或参数后重试。
- 提交后的 `TIMEOUT` 表示结果不确定，先查看目标线程，不能自动重发。
- 不把正文清空、其他文章的链接或旧发送提示当作成功。

## Manual recovery

使用 `cloudl browser` 打开同一目标，定位评论编辑框，使用 `fill` 精确填入多段正文，再调用目标编辑框的发送按钮。收到新发送提示或看到自己的新评论后完成。保留用户文字，不把多段或含链接的评论改为独立推文。
