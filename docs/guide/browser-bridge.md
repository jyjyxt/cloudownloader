# Browser Bridge Setup

> **⚠️ Important**: Browser commands reuse your Chrome login session. You must be logged into the target website in Chrome before running commands.

Cloudl connects to your browser through a lightweight **Browser Bridge** Chrome Extension + micro-daemon (zero config, auto-start).

## Extension Installation

### Method 1: Install from the Chrome Web Store (Recommended)

1. Open [Cloudl on the Chrome Web Store](https://chromewebstore.google.com/detail/cloudl/eajdmnipgdkcfooackbbobapnenbgnlf) in Chrome.
2. Click **Add to Chrome** and confirm the installation. No build or Developer mode is required.

Chrome automatically updates the extension when a new store version is available.

### Method 2: Build and Load from Source

Run these commands from the repository root:

```bash
npm --prefix extension install
npm --prefix extension run build
```

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select the `extension/` directory from the repository.

Select the directory containing `manifest.json`, not `extension/dist/`. Keep this directory in place because Chrome continues to read its files. The root `npm run build` builds only the CLI.

To update a source installation, pull the latest code, rerun the commands above, then click **Reload** on the Cloudl extension in `chrome://extensions`.

## Verification

That's it! The daemon auto-starts when you run any browser command. No tokens, no manual configuration.

```bash
cloudl doctor            # Check extension + daemon connectivity
```

## Tab Targeting

Browser commands require an explicit `<session>` positional immediately after `browser`. Use the same session name for a multi-step flow, and use different names to isolate parallel work.

```bash
cloudl browser baidu open https://www.baidu.com/
cloudl browser baidu tab list
cloudl browser baidu tab new https://www.baidu.com/
cloudl browser baidu eval --tab <targetId> 'document.title'
cloudl browser baidu tab select <targetId>
cloudl browser baidu get title
cloudl browser baidu tab close <targetId>
```

Key rules:

- `cloudl browser <session> open <url>` and `cloudl browser <session> tab new [url]` return a `targetId`.
- `cloudl browser <session> tab list` prints the `targetId` values of tabs that already exist.
- `--tab <targetId>` routes a single browser command to that specific tab.
- `tab new` creates a new tab but does not change the default browser target.
- `tab select <targetId>` makes that tab the default target for later untargeted `cloudl browser ...` commands.
- `tab close <targetId>` removes the tab; if it was the current default target, the stored default is cleared.

## Session Lifecycle

Use a stable session name when you want multiple `cloudl browser` commands to keep operating on the same page:

```bash
cloudl browser my-session open https://example.com
cloudl browser my-session state
cloudl browser my-session extract "main"
```

Owned browser sessions use an interactive tab lease with a 10-minute idle timeout. Release it explicitly when done:

```bash
cloudl browser my-session close
```

Use `cloudl browser <session> bind` when you want to attach Cloudl to a Chrome tab you already opened manually. Bound sessions do not have the owned-session idle close timer; they stay attached until `unbind`, tab close, window close, or daemon restart. For owned sessions, use `--window foreground` to watch Cloudl work in a visible automation window, or `--window background` to keep that automation window out of the way.

The `Cloudl Browser` and `Cloudl Adapter` tab groups are extension-managed automation containers; avoid putting your own long-lived tabs in them or renaming them.

## How It Works

```
┌─────────────┐     WebSocket      ┌──────────────┐     Chrome API     ┌─────────┐
│  cloudl    │ ◄──────────────► │  micro-daemon │ ◄──────────────► │  Chrome  │
│  (Node.js)  │    localhost:19825  │  (auto-start) │    Extension       │ Browser  │
└─────────────┘                    └──────────────┘                    └─────────┘
```

The daemon manages the WebSocket connection between your CLI commands and the Chrome extension. The extension executes JavaScript in the context of web pages, with access to the logged-in session.

## Daemon Lifecycle

The daemon auto-starts on first browser command and stays alive persistently.

```bash
cloudl daemon stop      # Graceful shutdown
```

The daemon is persistent — it stays alive until you explicitly stop it (`cloudl daemon stop`) or uninstall the package.

## Running Cloudl from a remote machine

If you need to run `cloudl` on a remote server (CI runner, agent host) but keep the browser session on your local machine, see [Remote Orchestration](/guide/remote-orchestration). It walks through the SSH reverse-tunnel pattern so the daemon never leaves localhost.
