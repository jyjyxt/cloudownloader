# Browser Bridge 设置

> **⚠️ 重要**: 浏览器命令复用你的 Chrome 登录会话。运行命令前必须在 Chrome 中登录目标网站。

Cloudl 通过轻量级 **Browser Bridge** Chrome 扩展 + 微守护进程连接浏览器（零配置，自动启动）。

## 扩展安装

### 方法 1：从 Chrome 应用商店安装（推荐）

1. 在 Chrome 中打开 [Cloudl 扩展的应用商店页面](https://chromewebstore.google.com/detail/cloudl/eajdmnipgdkcfooackbbobapnenbgnlf)。
2. 点击**添加至 Chrome** 并确认安装，无需编译或启用开发者模式。

商店发布新版本后，Chrome 会自动更新扩展。

### 方法 2：自行编译并加载

在仓库根目录执行：

```bash
npm --prefix extension install
npm --prefix extension run build
```

1. 打开 `chrome://extensions`，启用**开发者模式**。
2. 点击**加载已解压的扩展程序**，选择仓库中的 `extension/` 目录。

请选择包含 `manifest.json` 的目录，不要选择 `extension/dist/`。Chrome 会持续读取该目录中的文件，因此请保留该目录及其路径。根目录的 `npm run build` 只构建 CLI。

更新源码安装的扩展时，先拉取最新代码，再重新执行上述命令，最后到 `chrome://extensions` 点击 Cloudl 扩展的**重新加载**按钮。

## 验证

```bash
cloudl doctor            # 检查扩展 + 守护进程连接
```

## 多 Tab 定位

浏览器命令必须紧跟一个 `<session>` 位置参数。同一个多步骤流程使用同一个 session；并行任务使用不同 session 隔离。

```bash
cloudl browser baidu open https://www.baidu.com/
cloudl browser baidu tab list
cloudl browser baidu tab new https://www.baidu.com/
cloudl browser baidu eval --tab <targetId> 'document.title'
cloudl browser baidu tab select <targetId>
cloudl browser baidu get title
cloudl browser baidu tab close <targetId>
```

规则如下：

- `cloudl browser <session> open <url>` 和 `cloudl browser <session> tab new [url]` 都会返回 `targetId`。
- `cloudl browser <session> tab list` 会打印当前已存在 tab 的 `targetId`。
- `--tab <targetId>` 会把单条 browser 命令路由到对应 tab。
- `tab new` 只会新建 tab，不会改变默认浏览器目标。
- `tab select <targetId>` 会把该 tab 设为后续未显式指定 target 的 `cloudl browser ...` 命令默认目标。
- `tab close <targetId>` 会关闭该 tab；如果它正好是当前默认目标，会一并清掉这条默认绑定。

## Session 生命周期

如果你希望多条 `cloudl browser` 命令持续操作同一个页面，请使用稳定的 session 名称：

```bash
cloudl browser my-session open https://example.com
cloudl browser my-session state
cloudl browser my-session extract "main"
```

Cloudl 拥有的 browser session 使用交互式 tab lease，默认空闲超时为 10 分钟。完成后可以显式释放：

```bash
cloudl browser my-session close
```

如果要把 Cloudl 绑定到你已经手动打开的 Chrome tab，请使用 `cloudl browser <session> bind`。绑定 session 没有 owned session 的 idle close 计时器，会一直保持到 `unbind`、tab 关闭、窗口关闭或 daemon 重启。对于 Cloudl 自己创建的 owned session，使用 `--window foreground` 可以在可见自动化窗口里观察 Cloudl 操作；使用 `--window background` 可以让这个自动化窗口留在后台。

`Cloudl Browser` 和 `Cloudl Adapter` tab group 是扩展管理的自动化容器；请不要把自己的长期 tab 放进去，也不要重命名。

## Daemon 生命周期

Daemon 在首次运行浏览器命令时自动启动，之后保持常驻运行。

```bash
cloudl daemon stop      # 优雅关停
```

Daemon 为常驻模式，会一直运行直到你显式停止（`cloudl daemon stop`）或卸载包。
