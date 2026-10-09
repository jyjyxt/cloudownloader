# 视频投稿准备

仓库中的准备工具负责生成平台投稿参数、适配封面，以及填入并核对实际网页字段。工具不上传、不点击发布、不生成发布历史报告；原有适配器的防重复提交状态仍保留。

## 投稿参数与封面

在选用的 Python 环境中执行 `python3 -m pip install -r scripts/video-publication-requirements.txt` 安装封面处理依赖。

需要 Python 3.11+、`ffprobe`；生成封面时还需要 Pillow。将当前成片、已确认的文案和适用的平台设置写入 JSON：

```json
{
  "video": "/absolute/path/full.mp4",
  "account": "你的账号名",
  "title": "用一张字幕图，表达一个完整观点",
  "description": "已确认的简介与素材来源",
  "tags": ["字幕拼图", "效率工具"],
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

内容声明、原创和儿童受众设置按实际作品填写。相对路径以输入 JSON 所在目录为基准。可用 `platform_text` 明确指定某个平台的正文，例如 `{"douyin":"指定正文 #话题"}`；未指定时原样使用 `description`。工具不自动在正文后拼接标签。不提供 `covers` 时只准备投稿参数。

```sh
python3 scripts/prepare-video-publication.py shared.json --output-dir /tmp/video-preparation
```

工具读取实际成片的时长、尺寸和校验值，生成抖音、小红书、视频号、YouTube、Bilibili 的 `publish_<platform>.json`。保持调用方指定的文案与语言，仅将视频号短标题中的逗号改为空格；超出平台字数限制时明确报错，不截断文案。只准备部分平台可传 `--platforms xiaohongshu bilibili`。

封面保留原图比例和完整内容，输出 `cover_3x4.png`（720×960）、`cover_douyin_portrait.png`（1080×1440）、`cover_youtube.png`（1280×720）和 `cover_bilibili.png`（1440×1080）。B 站封面的全部内容放在中央 16:9 区域，兼顾 4:3 与 16:9 裁切。仍须核对平台实际预览；原图已经裁掉的内容无法通过缩放补回。

目标文件存在时需显式传 `--overwrite`。已有适配器状态不是 `prepared` 的投稿参数，即使传该参数也不会覆盖；新的作品使用新的输出目录。

小红书、视频号和 B 站的参数不包含本地 `cover` 字段，避免传入当前适配器无法应用的封面参数。准备上传后，通过网页上传、裁切并保存封面；支持的平台可再填写实际保存的 `cover_url`。具体用法见[小红书](../../adapters/browser/xiaohongshu-publish-video.md)、[视频号](../../adapters/browser/wechat-channels-publish-video.md)和[B 站](../../adapters/browser/bilibili-publish-video.md)。抖音发布命令仍为 `publish <video>`，生成的 JSON 也可以用于下方的字段填入工具。YouTube 仍通过 Cloudl Browser 操作 Studio，本工具不提供新的 YouTube 上传适配器。

## 从 JSON 填入长文案

```sh
node scripts/fill-publish-field.mjs /tmp/video-preparation/publish_xiaohongshu.json \
  --session xhs-upload --selector '.tiptap.ProseMirror' --field content --paragraphs

# 抖音编辑器吞掉输入末字时，显式添加可丢弃的空行：
node scripts/fill-publish-field.mjs /tmp/video-preparation/publish_douyin.json \
  --session dy-upload --selector '[contenteditable="true"]' --field caption --paragraphs --editor-tail
```

先观察真实页面，再使用实际字段的选择器。工具通过进程参数传递原始文本，填入一次后读取字段真实内容。默认严格匹配；`--paragraphs` 仅允许富文本编辑器的 U+200B 光标占位符、换行与空段差异，以及段落两端的空白，段内空格、标点、链接、正文和末字仍须匹配。普通输入框与文本框保持严格匹配。

`--editor-tail` 在输入时追加可丢弃的空行，核对时仍使用原始正文。缺字、重复、内容变化或选择器对应多个元素时会报错；填入失败后也不会点击发布。

这些脚本需要与 Cloudl 相同的浏览器服务和网络权限。沙箱连接失败不代表视频上传失败；保留已准备的页面，核对后恢复连接，再决定是否续传。字段填入成功不等于发表成功；提交结果不明确时先核对作品管理，避免重复提交。

本地适配器修复进入仓库后，先备份独有改动，再执行 `cloudl adapter reset <site>`，避免旧的 `~/.cloudl/clis/` 副本继续覆盖仓库更新。`cloudl adapter status` 可查看当前覆盖状态。
