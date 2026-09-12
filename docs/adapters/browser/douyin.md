# Douyin (抖音创作者中心)

**Mode**: 🔐 Browser · **Domain**: `creator.douyin.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl douyin profile` | 获取账号信息 |
| `cloudl douyin videos` | 获取作品列表 |
| `cloudl douyin drafts` | 获取草稿列表 |
| `cloudl douyin draft` | 上传视频并保存为草稿 |
| `cloudl douyin publish` | 定时发布视频到抖音 |
| `cloudl douyin update` | 更新视频信息 |
| `cloudl douyin delete` | 删除作品 |
| `cloudl douyin stats` | 查询作品数据分析 |
| `cloudl douyin collections` | 获取合集列表 |
| `cloudl douyin activities` | 获取官方活动列表 |
| `cloudl douyin location` | 搜索发布可用的地理位置 |
| `cloudl douyin hashtag search` | 按关键词搜索话题 |
| `cloudl douyin hashtag suggest` | 基于封面 URI 推荐话题 |
| `cloudl douyin hashtag hot` | 获取热点词 |

## Usage Examples

```bash
# 账号与作品
cloudl douyin profile
cloudl douyin videos --limit 10
cloudl douyin videos --status scheduled
cloudl douyin drafts

# 发布前辅助信息
cloudl douyin collections
cloudl douyin activities
cloudl douyin location "东京塔"
cloudl douyin hashtag search "春游"
cloudl douyin hashtag hot --limit 10

# 保存草稿
cloudl douyin draft ./video.mp4 \
  --title "春游 vlog" \
  --caption "#春游 先存草稿"

# 定时发布
cloudl douyin publish ./video.mp4 \
  --title "春游 vlog" \
  --caption "#春游 今天去看樱花" \
  --schedule "2026-04-08T12:00:00+09:00"

# 也支持 Unix 秒字符串
cloudl douyin publish ./video.mp4 \
  --title "春游 vlog" \
  --schedule 1775617200

# 更新与删除
cloudl douyin update 1234567890 --caption "更新后的文案"
cloudl douyin update 1234567890 --reschedule "2026-04-09T20:00:00+09:00"
cloudl douyin delete 1234567890

# JSON 输出
cloudl douyin profile -f json
```

## Prerequisites

- Chrome running and **logged into** `creator.douyin.com`
- The logged-in account must have access to Douyin Creator Center publishing features
- [Browser Bridge extension](/guide/browser-bridge) installed

## Notes

- `publish` requires `--schedule` to be at least 2 hours later and no more than 14 days later
- `draft` and `publish` upload the video through Douyin/ByteDance browser-authenticated APIs, so cookies in the active browser session must be valid
- `hashtag suggest` expects a valid `cover`/`cover_uri` value produced during the publish pipeline; for normal manual use, `hashtag search` and `hashtag hot` are usually more convenient
