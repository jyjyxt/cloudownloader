# cloudl

网站：https://cloudownloader.com/

用于网站适配器、浏览器自动化和媒体下载的命令行工具。源码：[jyjyxt/cloudownloader](https://github.com/jyjyxt/cloudownloader)。

命令名为 `cloudl`，使用 `~/.cloudl` 配置目录、`CLOUDL_*` 环境变量和 `cloudl-*` skill。

[![English](https://img.shields.io/badge/docs-English-1D4ED8?style=flat-square)](./README.md)

cloudl 可以用同一套 CLI 做三类事情：

- **直接使用现成适配器**：B站、知乎、小红书、Twitter/X、Reddit、HackerNews 等站点的适配器已收录，详见[内置命令](#内置命令)。
- **让 AI Agent 操作浏览器页面**：在你的 AI Agent（Claude Code、Cursor 等）中安装 `cloudl-browser` skill，Agent 就能用你的已登录浏览器导航、点击、输入/填充、提取任意网页内容。
- **把新网站写成 CLI**：用 `cloudl browser` 原语 + `cloudl-adapter-author` skill，从站点侦察、API 发现、字段解码到 `cloudl browser recon verify <site>/<command>` 一条龙。

除了网站能力，cloudl 还是一个 **CLI 枢纽**：你可以把 `gh`、`docker`、`longbridge`、`tg`、`discord`、`wx`、`ntn`（Notion）等本地工具统一注册到 `cloudl` 下，也可以通过桌面端适配器控制 Cursor、Trae CN、Codex、Antigravity、ChatGPT、Trae SOLO 等 Electron 应用。

## 快速开始

### 1. 安装 cloudl

需要 **Node.js >= 20.18.1**。从本仓库安装：

```bash
git clone https://github.com/jyjyxt/cloudownloader.git
cd cloudownloader
npm install
npm link
cloudl --help
```

`npm install` 会通过 prepare 脚本构建 CLI，`npm link` 安装 `cloudl` 命令。在当前网站工作区中，请进入其 `cloudl/` 子目录执行安装命令。

### 2. 安装 Browser Bridge 扩展

cloudl 通过轻量 Browser Bridge 扩展和本地微型 daemon 与 Chrome/Chromium 通信。daemon 会按需自动启动。

**手动安装（目前唯一支持的方式）：**
1. 到 GitHub [Releases 页面](https://github.com/jyjyxt/cloudownloader/releases) 下载最新的 `cloudl-extension-v{version}.zip`。
2. 解压后打开 `chrome://extensions`，启用 **开发者模式**。
3. 点击 **加载已解压的扩展程序**，选择解压后的目录。

### 3. 验证环境

```bash
cloudl doctor
```

### 4. 跑第一个命令

```bash
cloudl list
cloudl hackernews top --limit 5
cloudl bilibili hot --limit 5
```

## 更新 cloudl 和浏览器扩展

命令行程序和网站适配器位于本仓库中，Chrome 扩展负责执行 CLI 发来的浏览器操作。网页布局或接口发生变化时，通常只需修改对应的网站适配器，不必每次都更新扩展。

### 更新源码安装的 CLI

在已有的仓库目录中执行：

```bash
git pull --ff-only
npm install
cloudl --version
cloudl doctor
```

`npm install` 会更新依赖，并通过 prepare 脚本重新构建 CLI。已有的 `npm link` 会继续指向这个目录，除非移动仓库或切换 Node.js 安装，否则不需要重新关联。

在本地修改 CLI 或适配器代码后，执行 `npm run build`，再运行受影响的命令验证修改。如果同时修改了依赖，则执行 `npm install`。

### 按需更新 Chrome 扩展

当发布说明要求新增浏览器能力、权限或通信协议变更，或者包含你需要的扩展修复时，再更新扩展。仅修改 CLI 或网站适配器，通常不需要升级扩展。

手动加载的扩展不会自动安装新版本：

1. 从 GitHub [Releases 页面](https://github.com/jyjyxt/cloudownloader/releases) 下载 `cloudl-extension-v{version}.zip`。
2. 将新版本解压后的文件替换到 Chrome 已加载的扩展目录中。
3. 打开 `chrome://extensions`，点击 **Cloudl** 扩展的 **重新加载** 按钮。如果改用新目录，先移除旧扩展，再通过 **加载已解压的扩展程序** 选择新目录。
4. 执行 `cloudl doctor` 检查连接，再运行需要使用的浏览器命令。

## 给人类用户

如果你只是想稳定地调用网站或桌面应用能力，主路径很简单：

- `cloudl list` 查看当前所有命令
- `cloudl <site> <command>` 调用内置或生成好的适配器
- `cloudl external register mycli` 把本地 CLI 接入同一发现入口
- `cloudl doctor` 处理浏览器连通性问题

## 扩展 cloudl

如果你想新增自己的命令，先看 [扩展 cloudl](./docs/zh/guide/extending-cloudl.md)。README 只保留入口；目录结构、源码管理方式和安装命令放在文档里。

| 需求 | 推荐路径 |
|------|----------|
| 把个人网站命令放在自己的 Git repo | `cloudl plugin create` + `cloudl plugin install file://...` |
| 快速写一个本机私人 adapter | `cloudl browser recon init <site>/<command>`，放在 `~/.cloudl/clis/` |
| 本地修改官方 adapter | `cloudl adapter eject <site>` + `cloudl adapter reset <site>` |
| 发布或安装第三方命令 | `cloudl plugin install github:user/repo` |
| 包装已有本机 binary | `cloudl external register <name>` |

## 给 AI Agent

cloudl 的 browser 命令既可以直接执行，也可以由 AI Agent 调用。把 skill 安装到你的 AI Agent（Claude Code、Cursor 等）中，Agent 就能用你的已登录 Chrome 会话替你操作网站。

下面的 `cloudl-*` 是已打包的 skill 的实际名称，其中的命令示例统一使用 `cloudl`。

### 安装 skill（同时也用于更新）

```bash
npx skills add jyjyxt/cloudownloader
```

或只装需要的 skill：

```bash
npx skills add jyjyxt/cloudownloader --skill cloudl-adapter-author
npx skills add jyjyxt/cloudownloader --skill cloudl-autofix
npx skills add jyjyxt/cloudownloader --skill cloudl-browser
npx skills add jyjyxt/cloudownloader --skill cloudl-browser-sitemap
npx skills add jyjyxt/cloudownloader --skill cloudl-sitemap-author
npx skills add jyjyxt/cloudownloader --skill cloudl-usage
```

### 选择哪个 skill

| Skill | 适用场景 | 你对 AI Agent 说的话 |
|-------|---------|-------------------|
| **cloudl-adapter-author** | 为新站点写可复用适配器，或给已有站点添加命令 | "帮我做一个抖音热门的适配器" / "帮我做一个抓取这个页面热帖的命令" |
| **cloudl-autofix** | 内置命令失败时修复已有适配器 | "`cloudl zhihu hot` 返回空了，修一下" |
| **cloudl-browser** | 实时驱动 Chrome 页面——导航、填表单、点击、抓取 | "帮我看看小红书的通知" / "帮我填一下这个表单" / "用浏览器命令抓取这个页面" |
| **cloudl-browser-sitemap** | 使用站点 sitemap 上下文来操作浏览器任务 | "用 sitemap 帮我少走弯路地操作这个网站" |
| **cloudl-sitemap-author** | 创建或更新面向浏览器 Agent 的站点 sitemap | "把刚发现的稳定流程记录到这个站点的 sitemap" |
| **cloudl-usage** | 所有命令和站点的快速参考 | "cloudl 有哪些 Twitter 相关的命令？" |

### 工作原理

安装 `cloudl-browser` skill 后，你的 AI Agent 可以：

1. **导航**到任意 URL，使用你的已登录浏览器
2. **读取**页面内容——通过结构化 DOM 快照（不是截图）
3. **交互**——点击按钮、填写表单、选择选项、按键
4. **提取**页面数据或拦截网络 API 响应
5. **等待**元素、文本或页面跳转

Agent 在内部自动处理所有 `cloudl browser` 命令——你只需用自然语言描述想做的事。

**Skill 参考文档：**
- [`skills/cloudl-browser/SKILL.md`](./skills/cloudl-browser/SKILL.md) — 实时驱动 Chrome（导航、填表单、点击、抓取）
- [`skills/cloudl-browser-sitemap/SKILL.md`](./skills/cloudl-browser-sitemap/SKILL.md) — 操作浏览器任务时消费 sitemap 上下文
- [`skills/cloudl-sitemap-author/SKILL.md`](./skills/cloudl-sitemap-author/SKILL.md) — 创建或更新站点 sitemap 知识
- [`skills/cloudl-adapter-author/SKILL.md`](./skills/cloudl-adapter-author/SKILL.md) — 给新站点写适配器，全流程
- [`skills/cloudl-autofix/SKILL.md`](./skills/cloudl-autofix/SKILL.md) — 修复已有适配器
- [`skills/cloudl-usage/SKILL.md`](./skills/cloudl-usage/SKILL.md) — 命令和站点参考

`browser` 可用命令包括：`open`、`state`、`click`、`type`、`fill`、`select`、`keys`、`wait`、`get`、`find`、`extract`、`frames`、`screenshot`、`scroll`、`back`、`eval`、`network`、`tab list`、`tab new`、`tab select`、`tab close`、`init`、`verify`、`close`。

`cloudl browser` 命令必须紧跟一个 `<session>` 位置参数。`cloudl browser work open <url>` 和 `cloudl browser work tab new [url]` 都会返回 target ID。`cloudl browser work tab list` 用来查看当前已存在 tab 的 target ID，再通过 `--tab <targetId>` 把命令明确路由到某个 tab。`tab new` 只会新建 tab，不会改变默认浏览器目标；只有显式执行 `tab select <targetId>`，才会把该 tab 设为同一 session 后续未指定 target 的默认目标。

## 为新站点写适配器

当你需要的网站还没覆盖时，用 `cloudl-adapter-author` skill，全流程：

1. **侦察**站点，分类 pattern（SPA / SSR / JSONP / Token / Streaming）
2. **发现** endpoint——network 精读、initial state、bundle 搜索、token 溯源，或 interceptor 兜底
3. **定认证**——`PUBLIC` / `COOKIE` / `INTERCEPT` / `UI` / `LOCAL`
4. **字段解码** + 设计输出列
5. `cloudl browser recon analyze <url>` → `cloudl browser recon init <site>/<name>` → 写适配器 → `cloudl browser recon verify <site>/<name>`
6. 站点知识沉到 `~/.cloudl/sites/<site>/`，下次同站点直接吃缓存

## 配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `CLOUDL_WINDOW` | 命令默认值 | 设为 `foreground` 或 `background` 来覆盖 Browser Bridge 窗口位置。浏览器型命令也支持 `--window <foreground\|background>` |
| `CLOUDL_BROWSER_CONNECT_TIMEOUT` | `45` | 浏览器连接超时（秒） |
| `CLOUDL_BROWSER_COMMAND_TIMEOUT` | `60` | 单个浏览器命令超时（秒） |
| `CLOUDL_CDP_ENDPOINT` | — | Chrome DevTools Protocol 端点，用于远程浏览器或 Electron 应用 |
| `CLOUDL_CDP_TARGET` | — | 按 URL 子串过滤 CDP target（如 `detail.1688.com`） |
| `CLOUDL_VERBOSE` | `false` | 启用详细日志（`-v` 也可以） |
| `DEBUG_SNAPSHOT` | — | 设为 `1` 输出 DOM 快照调试信息 |

Browser Bridge daemon 与扩展的通信端口固定为 `localhost:19825`，不再支持通过 `CLOUDL_DAEMON_PORT` 配置自定义端口。

`cloudl browser *` 必须紧跟一个 `<session>` 位置参数，默认使用前台窗口，并保留该 session 的 tab lease，直到你手动执行 `cloudl browser <session> close` 或等空闲超时。浏览器型 adapter 默认使用后台 adapter 窗口并在命令结束后释放一次性 tab lease；如果需要调试最终页面，可以传 `--window foreground --keep-tab true`。

## 内置命令

以下命令已在仓库中注册。实际调用受目标网站、登录状态和本地依赖影响；以 `cloudl list` 和 `cloudl <site> <command> --help` 的输出为准。

运行 `cloudl list` 查看完整注册表。

| 站点 | 命令 |
|------|------|
| **xiaohongshu** | `search` `ask` `note` `comments` `notifications` `feed` `user` `saved` `liked` `download` `publish` `follow` `unfollow` `creator-notes` `creator-note-detail` `creator-notes-summary` `creator-profile` `creator-stats` |
| **medium** | `login` `whoami` `search` `feed` `tag` `user` `draft-create` `publish` |
| **bilibili** | `hot` `search` `me` `favorite` `history` `feed` `subtitle` `summary` `video` `comments` `dynamic` `ranking` `following` `follow` `unfollow` `user-videos` `download` `creator-stats` |
| **zhihu** | `hot` `search` `question` `download` `follow` `like` `favorite` `comment` `answer` |
| **hackernews** | `top` `new` `best` `ask` `show` `jobs` `search` `user` |
| **hltv** | `search` `player-summary` `player-matches` `player-form` `player-map-pool` `player-vs-team` `player-teammate-impact` `player-duel` `match-map` `match-series` `team-matches` `team-map-pool` `event-matches` |
| **geogebra** | `eval` `add-point` `add-line` `add-circle` `add-polygon` `triangle` `hexagon` `list` `info` |
| **linkedin** | `connect` `inbox` `job-detail` `jobs-preferences` `post-analytics` `posts` `profile-experience` `profile-projects` `profile-read` `profile-analytics` `safe-send` `search` `people-search` `services-read` `sent-invitations` `thread-snapshot` `timeline` `salesnav-search` `salesnav-inbox` `salesnav-message` `salesnav-thread` |
| **reddit** | `hot` `frontpage` `popular` `search` `subreddit` `read` `user` `user-posts` `user-comments` `upvote` `save` `comment` `subscribe` `saved` `upvoted` |
| **twitter** | `trending` `search` `timeline` `tweets` `lists` `list-tweets` `list-create` `list-delete` `list-add` `list-add-batch` `list-remove` `list-remove-batch` `bookmarks` `profile` `thread` `following` `followers` `notifications` `post` `reply` `delete` `like` `likes` `article` `follow` `unfollow` `bookmark` `unbookmark` `download` `accept` `reply-dm` `block` `unblock` `hide-reply` |
| **claude** | `ask` `send` `new` `status` `read` `history` `detail` |
| **gemini** | `new` `ask` `image` `deep-research` `deep-research-result` |
| **notebooklm** | `status` `list` `open` `current` `get` `history` `summary` `note-list` `notes-get` `source-list` `source-get` `source-fulltext` `source-guide` |
| **amazon** | `bestsellers` `search` `product` `offer` `discussion` `movers-shakers` `new-releases` |
| **upwork** | `search` `feed` `detail` |
| **slock** | `message-send` `message-read` `message-search` `channel-list` `channel-info` `channel-create` `channel-members` `channel-join` `task-list` `task-create` `task-claim` `task-status` `task-convert` `task-delete` `thread-list` `thread-follow` `attachment-upload` `attachment-download` `bookmark-add` `inbox` `dm-list` `server-list` `server-use` `whoami` |
| **huodongxing** | `events` |
| **midjourney** | `login` `whoami` `settings` `quota` `generate` `describe` `history` `status` `action` `download` |

精选清单 — **[→ 查看全部 100+ 站点和命令](./docs/adapters/index.md)**（小红书 / B站 / 知乎 / Twitter / Reddit / 抖音 / 微博 / 微信读书 / 小宇宙 / 1688 / 夸克 / Spotify / 牛客 / arxiv / Chess.com / Bilibili / 等）。

### 外部 CLI 枢纽

把现有命令行工具统一接入 `cloudl <tool> ...`：

`gh` · `docker` · `vercel` · `wrangler` · `obsidian` · `longbridge` · `lark-cli` · `ntn(notion)` · `dws(DingTalk Workspace)` · `wecom-cli(企业微信)` · `tg(tg-cli)` · `discord(discord-cli)` · `wx(wx-cli)`

注册自定义本地 CLI：`cloudl external register <name>`；查看所有：`cloudl external list`。

**桌面应用适配器**（Electron，通过 CDP）：Cursor / Trae CN / Codex / Antigravity / ChatGPT App / ChatWise / Qoder / Discord / Doubao / Trae SOLO — 详见 [`docs/adapters/desktop/`](./docs/adapters/desktop/)。

## 下载支持

cloudl 支持从各平台下载图片、视频和文章。

### 支持的平台

| 平台 | 内容类型 | 说明 |
|------|----------|------|
| **小红书** | 图片、视频 | 下载笔记中的所有媒体文件 |
| **B站** | 视频 | 需要安装 `yt-dlp` |
| **Twitter/X** | 图片、视频 | 从用户媒体页或单条推文下载 |
| **Pixiv** | 图片 | 下载原始画质插画，支持多页作品 |
| **1688** | 图片、视频 | 下载商品页中可见的商品素材 |
| **小宇宙** | 音频、转录 | 使用本地凭证下载单集音频和转录 JSON / 文本 |
| **知乎** | 文章（Markdown） | 导出文章，可选下载图片到本地 |
| **微信公众号** | 文章（Markdown） | 导出微信公众号文章为 Markdown |
| **豆瓣** | 图片 | 下载电影条目的海报 / 剧照图片 |

### 前置依赖

下载流媒体平台的视频需要安装 `yt-dlp`：

```bash
# 安装 yt-dlp
pip install yt-dlp
# 或者
brew install yt-dlp
```

### 使用示例

```bash
# 下载小红书笔记中的图片/视频
cloudl xiaohongshu download "https://www.xiaohongshu.com/search_result/<id>?xsec_token=..." --output ./xhs
cloudl xiaohongshu download "https://xhslink.com/..." --output ./xhs
cloudl rednote download "https://www.rednote.com/search_result/<id>?xsec_token=..." --output ./rednote

# 下载B站视频（需要 yt-dlp）
cloudl bilibili download BV1xxx --output ./bilibili
cloudl bilibili download BV1xxx --quality 1080p  # 指定画质

# 下载 Twitter 用户的媒体
cloudl twitter download elonmusk --limit 20 --output ./twitter

# 下载单条推文的媒体
cloudl twitter download --tweet-url "https://x.com/user/status/123" --output ./twitter

# 下载豆瓣电影海报 / 剧照
cloudl douban download 30382501 --output ./douban

# 下载 1688 商品页中的图片 / 视频素材
cloudl 1688 download 841141931191 --output ./1688-downloads

# 下载小宇宙单集音频
cloudl xiaoyuzhou download 69b3b675772ac2295bfc01d0 --output ./xiaoyuzhou

# 下载小宇宙单集转录
cloudl xiaoyuzhou transcript 69dd0c98e2c8be31551f6a33 --output ./xiaoyuzhou-transcripts

# 导出知乎文章为 Markdown
cloudl zhihu download "https://zhuanlan.zhihu.com/p/xxx" --output ./zhihu

# 导出并下载图片
cloudl zhihu download "https://zhuanlan.zhihu.com/p/xxx" --download-images

# 导出微信公众号文章为 Markdown
cloudl weixin download --url "https://mp.weixin.qq.com/s/xxx" --output ./weixin
```

`cloudl xiaoyuzhou download` 和 `transcript` 需要本地小宇宙凭证：`~/.cloudl/xiaoyuzhou.json`。

## 输出格式

适配器命令支持 `--format` / `-f`，可选值为 `table`、`json`、`yaml`、`md`、`csv`。
`list` 命令也支持同样的格式参数，同时继续兼容 `--json`。

```bash
cloudl list -f yaml            # 用 YAML 列出命令注册表
cloudl bilibili hot -f table   # 默认：富文本表格
cloudl bilibili hot -f json    # JSON（适合传给 jq 或者各类 AI Agent）
cloudl bilibili hot -f yaml    # YAML（更适合人类直接阅读）
cloudl bilibili hot -f md      # Markdown
cloudl bilibili hot -f csv     # CSV
cloudl bilibili hot -v         # 详细模式：展示管线执行步骤调试信息
```

## 退出码

cloudl 遵循 Unix `sysexits.h`，CI / 脚本可按失败模式分支：`0` 成功、`66` 无数据、`69` Browser Bridge 未连接、`75` 超时、`77` 需要认证、`78` 配置错误、`130` Ctrl-C。完整参考：[docs/zh/guide/exit-codes.md](./docs/zh/guide/exit-codes.md)。

## 插件

通过社区贡献的插件扩展 cloudl。插件使用与内置命令相同的 JS 格式，启动时自动发现。

```bash
cloudl plugin list                                         # 查看已安装
cloudl plugin update my-tool                               # 更新到最新
cloudl plugin update --all                                 # 更新全部已安装插件
cloudl plugin uninstall my-tool                            # 卸载
```

当 plugin 的版本被记录到 `~/.cloudl/plugins.lock.json` 后，`cloudl plugin list` 也会显示对应的短 commit hash。

详见 [插件指南](./docs/zh/guide/plugins.md) 了解如何创建自己的插件。

## 常见问题排查

- **"Extension not connected" 报错**
  - 确保你已按上述步骤手动加载 Browser Bridge 扩展，且在 `chrome://extensions` 中**已启用**。
- **"attach failed: Cannot access a chrome-extension:// URL" 报错**
  - 其他 Chrome/Chromium 扩展（如 youmind、New Tab Override 或 AI 助手类扩展）可能产生冲突。请尝试**暂时禁用其他扩展**后重试。
- **返回空数据，或者报错 "Unauthorized"**
  - Chrome/Chromium 里的登录态可能已经过期。请打开当前页面，在新标签页重新手工登录或刷新该页面。
- **Node API 错误 / 缺少 `fetch` / 旧 Node 启动即崩**
  - cloudl 要求 **Node.js >= 20.18.1**。先执行 `node --version`，如果版本过低先升级，再重试命令。
- **Daemon 问题**
  - 检查 daemon 状态：`curl localhost:19825/status`
  - 查看扩展日志：`curl localhost:19825/logs`

## License

[Apache-2.0](./LICENSE) · [NOTICE](./NOTICE)
