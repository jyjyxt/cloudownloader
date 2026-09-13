# 快速开始

> **让任何网站或 Electron 应用成为你的 CLI。**
> 零风险 · 复用 Chrome 登录态 · AI 驱动发现 · 浏览器 + 桌面自动化

Cloudl 将**任何网站**或 **Electron 应用**变成命令行界面 — Bilibili、知乎、小红书、Twitter/X、Reddit、YouTube、Antigravity 等 — 基于浏览器会话复用和 AI 原生发现。

## 安装

```bash
git clone https://github.com/jyjyxt/cloudownloader.git
cd cloudownloader
npm install
npm link
```

## 基本使用

```bash
cloudl list                              # 查看所有命令
cloudl hackernews top --limit 5          # 公开 API，无需浏览器
cloudl bilibili hot --limit 5            # 浏览器命令
cloudl zhihu hot -f json                 # JSON 输出
```

## 输出格式

所有命令支持 `--format` / `-f`：

```bash
cloudl bilibili hot -f table   # 默认：终端表格
cloudl bilibili hot -f json    # JSON
cloudl bilibili hot -f yaml    # YAML
cloudl bilibili hot -f md      # Markdown
cloudl bilibili hot -f csv     # CSV
```

## 终端自动补全

Cloudl 支持智能的 Tab 自动补全，加快命令输入：

```bash
# 把自动补全加入 shell 启动配置
echo 'eval "$(cloudl completion zsh)"' >> ~/.zshrc              # Zsh
echo 'eval "$(cloudl completion bash)"' >> ~/.bashrc            # Bash
echo 'cloudl completion fish | source' >> ~/.config/fish/config.fish  # Fish

# 重启 shell 后，按 Tab 键补全：
cloudl [Tab]          # 补全站点名称（bilibili、zhihu、twitter...）
cloudl bilibili [Tab] # 补全命令（hot、search、me、download...）
```

补全功能包含：
- 所有可用的站点和适配器
- 内置命令（list、validate、verify、browser、doctor、plugin、adapter...）
- 命令别名
- 新增适配器时的实时更新

## 下一步

- [安装详情](/zh/guide/installation)
- [Browser Bridge 设置](/zh/guide/browser-bridge)
- [扩展 Cloudl：自定义命令、plugin 和 external CLI](/zh/guide/extending-cloudl)
- [所有适配器](/zh/adapters/)
- [开发者指南](/zh/developer/contributing)
- [给新 Electron 应用生成 CLI](/zh/guide/electron-app-cli)
