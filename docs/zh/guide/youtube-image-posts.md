# 发布 YouTube 图片动态

`cloudl youtube publish-post <metadata.json>` 在频道 Posts 页面准备一张图片和正文，保留调用方指定的文案与语言。

```json
{
  "channel": "UCxxxxxxxxxxxxxxxxxxxxxx",
  "account": "当前频道显示名称",
  "content": "使用你指定语言的简介。",
  "image": "image.jpg"
}
```

图片路径相对于 JSON 文件解析。当前命令支持一张不超过 16 MiB 的 JPG、PNG、GIF 或 WebP；平台支持多图，但此命令目前只处理单图。当前验证的编辑器语言为英文，可见范围必须为 Public。命令核对频道所有权、账号名称、完整正文、原图 SHA-256、图片预览与发布按钮状态。

```bash
cloudl youtube publish-post post.json --session youtube-post
# 检查编辑器中的完整图片、信息流预览和正文。
cloudl youtube publish-post post.json --session youtube-post --resume --execute
```

默认仅准备；`--execute` 提交一次后核对新动态和独立链接。`post.json.state.json` 回执绑定正文、图片内容和浏览器会话。已发表回执重复调用只返回原结果；不确定提交保留 `submitting`，禁止自动重试，先去频道核对后人工处理。更换内容时使用新 JSON 文件并保留旧回执，不删除仍在使用的发布锁。

2026-10-22 已实测可见编辑器。[YouTube 官方说明](https://support.google.com/youtube/answer/7124474)列出了图片格式与展示方式；竖图在信息流中可能显示为方形预览，发布前检查完整原图。

登录检测依据页面完成初始化后的登录状态，单次 Cookie 探测为空不会误报未登录；页面一直没有初始化时返回超时。
