# cloudl

Website: https://cloudownloader.com/

A command-line tool for website adapters, browser automation and media downloads. Source: [jyjyxt/cloudownloader](https://github.com/jyjyxt/cloudownloader).

The executable is `cloudl`, with `~/.cloudl` configuration, `CLOUDL_*` environment variables, and `cloudl-*` skills.

[![中文文档](https://img.shields.io/badge/docs-%E4%B8%AD%E6%96%87-0F766E?style=flat-square)](./README.zh-CN.md)

cloudl gives you one surface for three different kinds of automation:

- **Use built-in adapters** for sites like Bilibili, Zhihu, Xiaohongshu, Reddit, HackerNews, Twitter/X, and [many more](#built-in-commands).
- **Let AI agents operate browser pages** — install the `cloudl-browser` skill in your AI agent (Claude Code, Cursor, etc.), and it can navigate, click, type/fill, extract, and inspect any page through your logged-in browser via `cloudl browser` primitives.
- **Write new adapters** end-to-end with `cloudl browser` + the `cloudl-adapter-author` skill, which guides from first recon through field decoding, code, and `cloudl browser recon verify <site>/<command>`.

It also works as a **CLI hub** for local tools such as `gh`, `docker`, `longbridge`, `tg`, `discord`, `wx`, `ntn` (Notion), and other binaries you register yourself, plus **desktop app adapters** for Electron apps like Cursor, Trae CN, Codex, Antigravity, ChatGPT, and Trae SOLO.

## Quick Start

### 1. Install cloudl

Requires **Node.js >= 20.18.1**. Install from this repository:

```bash
git clone https://github.com/jyjyxt/cloudownloader.git
cd cloudownloader
npm install
npm link
cloudl --help
```

`npm install` builds the CLI through its prepare script; `npm link` installs the `cloudl` command. When working in this website workspace, run these commands inside its `cloudl/` subdirectory.

### 2. Install the Browser Bridge Extension

cloudl connects to Chrome/Chromium through a lightweight Browser Bridge extension plus a small local daemon. The daemon auto-starts when needed.

**Manual installation (currently the only supported method):**
1. Download the latest `cloudl-extension-v{version}.zip` from the GitHub [Releases page](https://github.com/jyjyxt/cloudownloader/releases).
2. Unzip it, open `chrome://extensions`, and enable **Developer mode**.
3. Click **Load unpacked** and select the unzipped folder.

### 3. Verify the setup

```bash
cloudl doctor
```

### 4. Optional: name your Chrome profile

Each Chrome profile runs its own cloudl extension instance. If you use multiple Chrome profiles, list the connected profiles and assign local aliases:

```bash
cloudl profile list
cloudl profile rename <contextId> work
cloudl profile use work
cloudl --profile work browser main state
```

With only one connected profile, cloudl uses it automatically. With multiple connected profiles and no default, cloudl asks you to choose instead of guessing.

### 5. Run your first commands

```bash
cloudl list
cloudl hackernews top --limit 5
cloudl bilibili hot --limit 5
```

## Updating cloudl and the extension

The CLI and website adapters live in this repository. The Chrome extension executes browser operations requested by the CLI. When a website changes its layout or API, updating the affected adapter is usually enough; the extension does not need an update for every CLI change.

### Update a source installation

Run these commands in your existing repository directory:

```bash
git pull --ff-only
npm install
cloudl --version
cloudl doctor
```

`npm install` updates dependencies and rebuilds the CLI through its prepare script. An existing `npm link` continues to point to this directory, so you do not need to link again unless you move the repository or switch Node.js installations.

After editing CLI or adapter code locally, run `npm run build`, then rerun the affected command to verify the change. If you also changed dependencies, run `npm install` instead.

### Update the Chrome extension when needed

Update the extension when a release requires new browser capabilities, permissions, or communication protocol changes, or includes extension fixes you need. CLI-only and website adapter changes usually do not require it.

Manually loaded extensions do not automatically install new releases:

1. Download `cloudl-extension-v{version}.zip` from the GitHub [Releases page](https://github.com/jyjyxt/cloudownloader/releases).
2. Replace the contents of the extension directory already loaded in Chrome with the newly extracted files.
3. Open `chrome://extensions` and click **Reload** on the **Cloudl** extension. If you use a different directory, remove the old extension and use **Load unpacked** to select the new directory.
4. Run `cloudl doctor` to verify connectivity, then rerun the browser command you need.

## For Humans

Use cloudl directly when you want a reliable command instead of a live browser session:

- `cloudl list` shows every registered command.
- `cloudl <site> <command>` runs a built-in or generated adapter.
- `cloudl external register mycli` exposes a local CLI through the same discovery surface.
- `cloudl doctor` helps diagnose browser connectivity.

## Extending cloudl

If you want to add your own commands, start with the [Extending cloudl guide](./docs/guide/extending-cloudl.md). README keeps this short; the guide covers the directory layout, source-control model, and install commands.

| Need | Recommended path |
|------|------------------|
| Keep personal website commands in your own Git repo | `cloudl plugin create` + `cloudl plugin install file://...` |
| Quickly draft a private local adapter | `cloudl browser recon init <site>/<command>` in `~/.cloudl/clis/` |
| Modify an official adapter locally | `cloudl adapter eject <site>` + `cloudl adapter reset <site>` |
| Publish or install third-party commands | `cloudl plugin install github:user/repo` |
| Wrap an existing local binary | `cloudl external register <name>` |

## For AI Agents

cloudl's browser commands can be run directly or by AI agents. Install skills into your AI agent (Claude Code, Cursor, etc.), and the agent operates websites on your behalf using your logged-in Chrome session.

The `cloudl-*` names below are the actual bundled skill identifiers; their command examples use `cloudl`.

### Install skills (also refreshes existing installs)

```bash
npx skills add jyjyxt/cloudownloader
```

Or install only what you need:

```bash
npx skills add jyjyxt/cloudownloader --skill cloudl-adapter-author
npx skills add jyjyxt/cloudownloader --skill cloudl-autofix
npx skills add jyjyxt/cloudownloader --skill cloudl-browser
npx skills add jyjyxt/cloudownloader --skill cloudl-browser-sitemap
npx skills add jyjyxt/cloudownloader --skill cloudl-sitemap-author
npx skills add jyjyxt/cloudownloader --skill cloudl-usage
```

### Which skill to use

| Skill | When to use | Example prompt to your AI agent |
|-------|------------|-------------------------------|
| **cloudl-adapter-author** | Write a reusable adapter for a new site or add a command to an existing site | "Write an adapter for douyin trending" / "Make a command that grabs the top posts from this page" |
| **cloudl-autofix** | Repair a broken adapter when a built-in command fails | "`cloudl zhihu hot` is returning empty — fix it" |
| **cloudl-browser** | Drive a real Chrome page ad-hoc — navigate, fill forms, click, extract | "Help me check my Xiaohongshu notifications" / "Help me fill out this form" / "Use browser commands to scrape this page" |
| **cloudl-browser-sitemap** | Consume site sitemap context while driving a browser task | "Use the sitemap to navigate this website without blind clicking" |
| **cloudl-sitemap-author** | Create or update site sitemap knowledge for browser agents | "Record the stable workflow you just discovered for this site" |
| **cloudl-usage** | Quick reference for all cloudl commands and sites | "What commands does cloudl have for Twitter?" |

### How it works

Once `cloudl-browser` is installed, your AI agent can:

1. **Navigate** to any URL using your logged-in browser
2. **Read** page content via structured DOM snapshots (not screenshots)
3. **Interact** — click buttons, fill forms, select options, press keys
4. **Extract** data from the page or intercept network API responses
5. **Wait** for elements, text, or page transitions

The agent handles all the `cloudl browser` commands internally — you just describe what you want done in natural language.

**Skill references:**
- [`skills/cloudl-browser/SKILL.md`](./skills/cloudl-browser/SKILL.md) — drive Chrome ad-hoc (navigate, fill forms, click, extract)
- [`skills/cloudl-browser-sitemap/SKILL.md`](./skills/cloudl-browser-sitemap/SKILL.md) — use sitemap context while driving a browser task
- [`skills/cloudl-sitemap-author/SKILL.md`](./skills/cloudl-sitemap-author/SKILL.md) — create or update site sitemap knowledge
- [`skills/cloudl-adapter-author/SKILL.md`](./skills/cloudl-adapter-author/SKILL.md) — write a new adapter end-to-end
- [`skills/cloudl-autofix/SKILL.md`](./skills/cloudl-autofix/SKILL.md) — repair broken adapters
- [`skills/cloudl-usage/SKILL.md`](./skills/cloudl-usage/SKILL.md) — command and site reference

Available browser commands include `open`, `state`, `click`, `type`, `fill`, `select`, `keys`, `wait`, `get`, `find`, `extract`, `frames`, `screenshot`, `scroll`, `back`, `eval`, `network`, `tab list`, `tab new`, `tab select`, `tab close`, `init`, `verify`, and `close`.

`cloudl browser` commands require a `<session>` positional immediately after `browser`. `cloudl browser work open <url>` and `cloudl browser work tab new [url]` both return a target ID. Use `cloudl browser work tab list` to inspect target IDs, then pass `--tab <targetId>` to route a command to a specific tab. `tab new` creates a new tab without changing the default browser target; only `tab select <targetId>` promotes that tab to the default target for later untargeted commands in the same session.

## Writing a new adapter

When the site you need is not yet covered, use the `cloudl-adapter-author` skill end-to-end:

1. **Recon** the site and pick a pattern (SPA / SSR / JSONP / Token / Streaming).
2. **Discover** the right endpoint — network inspection, initial state, bundle search, token trace, or interceptor fallback.
3. **Pick auth** — `PUBLIC` / `COOKIE` / `INTERCEPT` / `UI` / `LOCAL`.
4. **Decode** response fields and design output columns.
5. `cloudl browser recon analyze <url>` → `cloudl browser recon init <site>/<name>` → write adapter → `cloudl browser recon verify <site>/<name>`.
6. Site knowledge persists to `~/.cloudl/sites/<site>/` so the next adapter for the same site starts from context.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CLOUDL_PROFILE` | — | Browser Bridge profile alias/contextId to use when multiple Chrome profiles are connected |
| `CLOUDL_WINDOW` | command default | Set to `foreground` or `background` to override Browser Bridge window placement. Browser-backed commands also accept `--window <foreground\|background>`. |
| `CLOUDL_SITE_SESSION` | adapter default | Set to `ephemeral` or `persistent` to override `siteSession` metadata for browser-backed adapter commands. `ephemeral` closes the one-shot automation window when the command finishes; `persistent` reuses the site's session. Per-command `--site-session` takes precedence. |
| `CLOUDL_BROWSER_CONNECT_TIMEOUT` | `45` | Seconds to wait for browser connection |
| `CLOUDL_BROWSER_COMMAND_TIMEOUT` | `60` | Seconds to wait for a single browser command |
| `CLOUDL_CDP_ENDPOINT` | — | Chrome DevTools Protocol endpoint for remote browser or Electron apps |
| `CLOUDL_CDP_TARGET` | — | Filter CDP targets by URL substring (e.g. `detail.1688.com`) |
| `CLOUDL_VERBOSE` | `false` | Enable verbose logging (`-v` flag also works) |
| `DEBUG_SNAPSHOT` | — | Set to `1` for DOM snapshot debug output |

`cloudl browser *` requires an explicit `<session>` positional, uses a foreground browser window by default, and keeps that session's tab lease until `cloudl browser <session> close` or idle cleanup. Browser-backed adapters use a background adapter window and release one-shot tab leases by default. Interactive adapters can declare `siteSession: 'persistent'` to keep a stable site tab for continuity; pass `--site-session ephemeral` for a one-shot tab.

## Built-in Commands

These commands are registered in the repository. Live availability depends on the target site, login state and required local tools. Use `cloudl list` and `cloudl <site> <command> --help` for the installed command set and arguments.

| Site | Commands |
|------|----------|
| **xiaohongshu** | `search` `ask` `note` `comments` `feed` `user` `download` `publish` `follow` `unfollow` `notifications` `creator-notes` `creator-notes-summary` `creator-note-detail` `creator-profile` `creator-stats` |
| **bilibili** | `hot` `search` `history` `feed` `ranking` `download` `comments` `dynamic` `favorite` `following` `follow` `unfollow` `me` `subtitle` `summary` `video` `user-videos` `creator-stats` |
| **zhihu** | `hot` `search` `question` `download` `follow` `like` `favorite` `comment` `answer` |
| **hackernews** | `top` `new` `best` `ask` `show` `jobs` `search` `user` |
| **hltv** | `search` `player-summary` `player-matches` `player-form` `player-map-pool` `player-vs-team` `player-teammate-impact` `player-duel` `match-map` `match-series` `team-matches` `team-map-pool` `event-matches` |
| **geogebra** | `eval` `add-point` `add-line` `add-circle` `add-polygon` `triangle` `hexagon` `list` `info` |
| **linkedin** | `connect` `inbox` `job-detail` `jobs-preferences` `post-analytics` `posts` `profile-experience` `profile-projects` `profile-read` `profile-analytics` `safe-send` `search` `services-read` `sent-invitations` `thread-snapshot` `timeline` `salesnav-search` `salesnav-inbox` `salesnav-message` `salesnav-thread` |
| **reddit** | `hot` `frontpage` `popular` `search` `subreddit` `read` `user` `user-posts` `user-comments` `upvote` `upvoted` `save` `saved` `comment` `subscribe` |
| **twitter** | `trending` `search` `timeline` `tweets` `lists` `list-tweets` `list-create` `list-delete` `list-add` `list-add-batch` `list-remove` `list-remove-batch` `bookmarks` `post` `download` `profile` `article` `like` `likes` `notifications` `reply` `reply-dm` `thread` `follow` `unfollow` `followers` `following` `block` `unblock` `bookmark` `unbookmark` `delete` `hide-reply` `accept` |
| **claude** | `ask` `send` `new` `status` `read` `history` `detail` |
| **gemini** | `new` `ask` `image` `deep-research` `deep-research-result` |
| **notebooklm** | `status` `list` `open` `current` `get` `history` `summary` `note-list` `notes-get` `source-list` `source-get` `source-fulltext` `source-guide` |
| **amazon** | `bestsellers` `search` `product` `offer` `discussion` `movers-shakers` `new-releases` |
| **upwork** | `search` `feed` `detail` |
| **slock** | `message-send` `message-read` `message-search` `channel-list` `channel-info` `channel-create` `channel-members` `channel-join` `task-list` `task-create` `task-claim` `task-status` `task-convert` `task-delete` `thread-list` `thread-follow` `attachment-upload` `attachment-download` `bookmark-add` `inbox` `dm-list` `server-list` `server-use` `whoami` |
| **huodongxing** | `events` |
| **midjourney** | `login` `whoami` `settings` `quota` `generate` `describe` `history` `status` `action` `download` |

Curated highlights — **[→ see all 100+ supported sites & commands](./docs/adapters/index.md)** (douyin / weibo / spotify / 1688 / quark / nowcoder / google-scholar / hupu / xianyu / weread / weread-official / xiaoyuzhou / Chess.com / and more).

## CLI Hub

Unified passthrough for your existing command-line tools. Run `cloudl <tool> ...` for any of:

`gh` · `docker` · `vercel` · `wrangler` · `obsidian` · `longbridge` · `lark-cli` · `ntn(notion)` · `dws(DingTalk Workspace)` · `wecom-cli(企业微信)` · `tg(tg-cli)` · `discord(discord-cli)` · `wx(wx-cli)`

Register your own with `cloudl external register <name>`; list everything with `cloudl external list`.

**Desktop app adapters** (Electron, via CDP): Cursor / Trae CN / Codex / Antigravity / ChatGPT App / ChatWise / Qoder / Discord / Doubao / Trae SOLO — see [`docs/adapters/desktop/`](./docs/adapters/desktop/).

## Download Support

cloudl supports downloading images, videos, and articles from supported platforms.

| Platform | Content Types | Notes |
|----------|---------------|-------|
| **xiaohongshu** | Images, Videos | Downloads all media from a note |
| **rednote** | Images, Videos | Downloads all media from a signed rednote note URL |
| **bilibili** | Videos | Requires `yt-dlp` installed |
| **twitter** | Images, Videos | From user media tab or single tweet |
| **douban** | Images | Poster / still image lists |
| **pixiv** | Images | Original-quality illustrations, multi-page |
| **1688** | Images, Videos | Downloads page-visible product media from item pages |
| **xiaoyuzhou** | Audio, Transcript | Downloads episode audio and transcript JSON/text with local credentials |
| **zhihu** | Column articles, answers (Markdown) | Exports with optional image download |
| **weixin** | Articles (Markdown) | WeChat Official Account articles |

For the Bilibili video adapter, install `yt-dlp` first: `brew install yt-dlp`

```bash
cloudl xiaohongshu download "https://www.xiaohongshu.com/search_result/<id>?xsec_token=..." --output ./xhs
cloudl xiaohongshu download "https://xhslink.com/..." --output ./xhs
cloudl rednote download "https://www.rednote.com/search_result/<id>?xsec_token=..." --output ./rednote
cloudl bilibili download BV1xxx --output ./bilibili
cloudl twitter download elonmusk --limit 20 --output ./twitter
cloudl 1688 download 841141931191 --output ./1688-downloads
cloudl xiaoyuzhou download 69b3b675772ac2295bfc01d0 --output ./xiaoyuzhou
cloudl xiaoyuzhou transcript 69dd0c98e2c8be31551f6a33 --output ./xiaoyuzhou-transcripts
```

`cloudl xiaoyuzhou download` and `transcript` require local Xiaoyuzhou credentials in `~/.cloudl/xiaoyuzhou.json`.

## Output Formats

Adapter commands support `--format` / `-f` with `table` (default), `json`, `yaml`, `md`, and `csv`.

```bash
cloudl bilibili hot -f json    # Pipe to jq or LLMs
cloudl bilibili hot -f csv     # Spreadsheet-friendly
cloudl bilibili hot -v         # Verbose: show pipeline debug steps
```

## Exit Codes

cloudl follows Unix `sysexits.h` so CI / scripts can branch on failure mode: `0` success, `66` empty result, `69` Browser Bridge down, `75` timeout, `77` auth required, `78` config error, `130` Ctrl-C. Full reference: [docs/guide/exit-codes.md](./docs/guide/exit-codes.md).

## Plugins

Extend cloudl with community-contributed adapters:

```bash
cloudl plugin list
cloudl plugin update --all
cloudl plugin uninstall my-tool
```

See [Plugins Guide](./docs/guide/plugins.md) for creating your own plugin.

## Testing

See **[TESTING.md](./TESTING.md)** for how to run and write tests.

## Troubleshooting

- **"Extension not connected"** — Ensure the Browser Bridge extension is loaded manually using the steps above and **enabled** in `chrome://extensions`.
- **"attach failed: Cannot access a chrome-extension:// URL"** — Another extension may be interfering. Try disabling other extensions temporarily.
- **Empty data or 'Unauthorized' error** — Your Chrome/Chromium login session may have expired. Navigate to the target site and log in again.
- **Node API errors / missing `fetch` / startup crash on old Node** — cloudl requires **Node.js >= 20.18.1**. Run `node --version`, upgrade Node if needed, then retry.
- **Daemon issues** — Check status: `curl localhost:19825/status` · View logs: `curl localhost:19825/logs`

## License

[Apache-2.0](./LICENSE) · [NOTICE](./NOTICE)
