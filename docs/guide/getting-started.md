# Getting Started

> **Make any website or Electron App your CLI.**
> Zero risk · Reuse Chrome login · AI-powered discovery · Browser + Desktop automation


Cloudl turns **any website** or **Electron app** into a command-line interface — Bilibili, Zhihu, 小红书, Twitter/X, Reddit, YouTube, Antigravity, and [many more](/adapters/) — powered by browser session reuse and AI-native discovery.

## Highlights

- **Desktop App Control** — Drive Electron apps (Cursor, Codex, ChatGPT, etc.) directly from the terminal via CDP.
- **Browser Automation** — `browser` gives AI agents direct browser control: click, type/fill, extract, screenshot — fully scriptable.
- **Website → CLI** — Turn any website into a deterministic CLI: 100+ site surfaces are already registered, or author your own with the `cloudl-adapter-author` skill.
- **Account-safe** — Reuses Chrome's logged-in state; your credentials never leave the browser.
- **AI Agent ready** — `cloudl browser *` primitives (`open` / `network` / `state` / `eval` / `init` / `verify`) drive the adapter-authoring loop.
- **Zero LLM cost** — No tokens consumed at runtime. Run 10,000 times and pay nothing.
- **Deterministic** — Same command, same output schema, every time. Pipeable, scriptable, CI-friendly.

## Quick Start

### Install from source

```bash
git clone https://github.com/jyjyxt/cloudownloader.git
cd cloudownloader
npm install
npm link
```

### Basic Usage

```bash
cloudl list                              # See all commands
cloudl hackernews top --limit 5          # Public API, no browser
cloudl bilibili hot --limit 5            # Browser command
cloudl zhihu hot -f json                 # JSON output
```

### Output Formats

All built-in commands support `--format` / `-f`:

```bash
cloudl bilibili hot -f table   # Default: rich terminal table
cloudl bilibili hot -f json    # JSON (pipe to jq or LLMs)
cloudl bilibili hot -f yaml    # YAML (human-readable)
cloudl bilibili hot -f md      # Markdown
cloudl bilibili hot -f csv     # CSV
cloudl bilibili hot -v         # Verbose: show pipeline debug
```

### Tab Completion

Cloudl supports intelligent tab completion to speed up command input:

```bash
# Add shell completion to your startup config
echo 'eval "$(cloudl completion zsh)"' >> ~/.zshrc              # Zsh
echo 'eval "$(cloudl completion bash)"' >> ~/.bashrc            # Bash
echo 'cloudl completion fish | source' >> ~/.config/fish/config.fish  # Fish

# Restart your shell, then press Tab to complete:
cloudl [Tab]          # Complete site names (bilibili, zhihu, twitter...)
cloudl bilibili [Tab] # Complete commands (hot, search, me, download...)
```

The completion includes:
- All available sites and adapters
- Built-in commands (list, validate, verify, browser, doctor, plugin...)
- Command aliases
- Real-time updates as you add new adapters

## Next Steps

- [Installation details](/guide/installation)
- [Browser Bridge setup](/guide/browser-bridge)
- [Extending Cloudl — custom commands, plugins, and external CLIs](/guide/extending-cloudl)
- [Plugins — extend with community adapters](/guide/plugins)
- [All available adapters](/adapters/)
- [For developers / AI agents](/developer/contributing)
- [Add a new Electron app CLI](/guide/electron-app-cli)
