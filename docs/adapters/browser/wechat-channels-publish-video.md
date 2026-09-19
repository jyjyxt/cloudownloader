# 视频号完整视频发布

`cloudl wechat-channels publish-video` 仅用于微信视频号创作者中心
`https://channels.weixin.qq.com`，与微信公众号后台无关。

命令通过 Cloudl 的命名浏览器会话上传视频，核对账号、短标题和编辑器实际保存的描述，
提交后重新打开对应视频的「修改描述和封面」页面，只读取并核对已保存文案。
仅看到「已发表」提示或列表跳转不会被当作完整成功。

## 元数据

保存为 JSON 文件；视频路径建议使用绝对路径，相对路径以命令当前工作目录为基准。

```json
{
  "video": "/absolute/path/video.mp4",
  "account": "你的视频号名称",
  "title": "AI的6种日常用法",
  "caption": "完整视频描述、来源说明\n\n#人工智能 #AI工具"
}
```

`title` 必填，单行最多 16 字；`caption` 必填，最多 1000 字。
命令当前只支持适用「无需标注」的内容（可显式填写 `declaration: "无需标注"`），
不会主动勾选 AI 生成标签。需要其他标注的内容请在视频号界面处理。
使用视频自动生成的封面，位置设置为「不显示位置」，立即发表；暂不支持定时、合集或自定义封面。

## 使用

```sh
# 上传并准备，不发表
cloudl wechat-channels publish-video metadata.json --session wechat-video

# 继续同一会话中相同文件的上传并发表一次
cloudl wechat-channels publish-video metadata.json --session wechat-video --resume --execute

# 上传、核对、发表、复查，一次完成
cloudl wechat-channels publish-video metadata.json --execute --timeout 900 -f json

# 核对已有作品或恢复未确认的提交：只读取平台数据，不上传、不发表
cloudl wechat-channels publish-video metadata.json --verify 'export/作品ID' -f json
```

`--timeout` 为整体等待时间，默认 600 秒，允许 30–3600 秒。
需要 Chrome、Cloudl Browser Bridge 和已登录的视频号账号。
登录或管理员验证需要人工完成；命令不会绕过验证。
上传期间不要操作相同的浏览器会话。`--resume` 需要原会话仍保留上传表单；它不会恢复已关闭页面。
准备模式不保存平台草稿。

## 回执与恢复

命令在元数据旁保存 `metadata.json.state.json`，记录视频内容与文案指纹。
同一已发布回执再次执行会直接返回原结果；修改对应视频或文案后，不会覆盖原回执。
元数据和会话锁防止并发执行相同任务。

提交前先写入 `submitting` 状态，之后只点击一次「发表」。超时、断线、文案不匹配等情况
不会触发重发或自动删除。到视频管理页检查作品，取得编辑页 URL 中的 `objectId`
（解码 URL 中的值），再用 `--verify` 核对并更新回执。核对目标必须出现在当前视频列表页；
命令不自动翻页搜索历史作品。

进程被强制终止可能留下 `.lock` 文件。确认没有运行中的发布任务后，才可删除错误信息中列出的锁文件。
不要直接删除 `submitting` 回执来重试发表。

结果 `published` 表示作品已出现在管理列表，且重新打开的发布记录与元数据一致，
不额外承诺平台审核状态。返回的 `verification_url` 是账号后台链接。

## 实现约束

2026-09-19 验证的视频号编辑器位于 `wujie-app` 的 Shadow DOM 中。
上传时临时移动同一个文件输入节点供 CDP 使用，并在成功或失败后恢复原位置。
描述填写后调用编辑器自身的 `updateDescData()`，再检查其已保存的描述。
仅验证可见文本会漏掉「输入框有字、实际发布为空」的问题。
若编辑器接口、账号选择器或发布记录结构变化，命令停止并返回错误。
