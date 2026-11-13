# 微信公众号多图草稿

公众号操作止于保存并核对草稿，不会点击发表或群发。

`weixin create-draft [content]` 支持：

- `content`：可选，放在所有图片前面的正文。纯图片文章省略即可。
- `--images`：按正文顺序填写图片路径，逗号分隔。
- `--footer`：追加在所有图片后面的文字，可用于文末参考来源。
- `--cover-image`：默认首图作封面；指定时必须是 `--images` 中的一张，不重复插入正文。

```bash
cloudl weixin create-draft --title "拆掉一盏灯，另一盏凭什么还亮？" \
  --images ./01.jpg,./02.jpg,./03.jpg --cover-image ./01.jpg \
  --footer "参考来源：OpenStax，University Physics Volume 2，10.2"
cloudl weixin drafts --limit 5 -f yaml
```

适配器会逐张等待新图片上传到微信 CDN，保存前核对图片总数、正文文字及来源位于最后一张图之后。结果为草稿，不等于公开发表。

## 图文交错和独立封面

`--input` 接收一个 JSON 文件，包含 `cover` 和按顺序排列的 `blocks`。`html` 块用于正文文字和格式，`image` 块用于插图；图片可以是本地路径、`file:` 地址或 HTTP(S) 图片链接。封面会单独上传并设置为封面，不会重复插入正文。

```json
{"cover":"/绝对路径/封面.png","blocks":[{"type":"html","value":"<p>第一段</p>"},{"type":"image","value":"/绝对路径/插图.png"},{"type":"html","value":"<p>第二段</p>"}]}
```

```bash
cloudl weixin create-draft --title "图文示例" --input ./wechat-article.json
```
