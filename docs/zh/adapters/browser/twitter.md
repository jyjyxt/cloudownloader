# Twitter / X 评论

需要已登录 X 的 Chrome 与 Browser Bridge 扩展。

```bash
cloudl twitter whoami
cloudl twitter comment https://x.com/example/status/123 "感谢分享！"
cloudl twitter comment https://x.com/example/status/123 "附参考图" --image ./cover.webp
```

主要目标与评论正文使用位置参数。可选图片使用 `--image` 或 `--image-url`，两者不能同时提供。

## 多段内容与链接

```bash
cloudl twitter comment https://x.com/example/status/123 "开源项目：
https://github.com/example/project

安装说明：
https://example.com/skills/project" -f json
```

命令保留换行、标点和链接，定位目标推文的评论编辑框，精确填入正文后发送；不自动改写内容或改发独立推文。返回 `status`、`message`、`text`、`url`、`image` 和 `image-url`；没有图片或回执没有提供评论链接时，相关字段为 `null`。

只有新出现的成功回执才表示发送完成，编辑框清空不代表成功。提交结果不确定时以 `TIMEOUT`（退出码 75）结束，需要先查看目标推文，避免重发。
