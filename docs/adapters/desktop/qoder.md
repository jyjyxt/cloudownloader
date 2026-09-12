# Qoder

Control the **Qoder IDE** desktop app from OpenCLI through Chrome DevTools Protocol (CDP). Qoder is an Electron / VS Code-derived AI IDE; these commands operate the currently connected Qoder renderer, so open Qoder with remote debugging enabled before use.

## Prerequisites

1. Install Qoder.
2. Launch Qoder with CDP enabled on its registered port:

```bash
/Applications/Qoder.app/Contents/MacOS/Electron \
  --remote-debugging-port=9237 \
  --remote-allow-origins='*'
```

## Setup

```bash
export OPENCLI_CDP_ENDPOINT="http://127.0.0.1:9237"
```

## Commands

### Diagnostics

- `cloudl qoder status`: Check the active Qoder renderer URL and title.

### Quest Lifecycle

- `cloudl qoder new`: Start a new Quest.
- `cloudl qoder history --limit 20`: List visible Quests from the sidebar.
- `cloudl qoder read --limit 30`: Read visible turns in the current Quest.
- `cloudl qoder send "message"`: Send a message to the current Quest.
- `cloudl qoder ask "prompt" --timeout 120`: Send a prompt and wait for a visible reply.

### Sidebar And Views

- `cloudl qoder sidebar-toggle`: Collapse or expand the Quest sidebar.
- `cloudl qoder open-panel`: Toggle the bottom panel.
- `cloudl qoder search "query"`: Open the Qoder search palette and list results.
- `cloudl qoder settings`: Open Settings.
- `cloudl qoder knowledge`: Open Knowledge.
- `cloudl qoder marketplace`: Open Marketplace.
- `cloudl qoder credits`: Open Credits Usage and read the visible popover.
- `cloudl qoder view-all`: Click View all in the Quest list.
- `cloudl qoder add-workspace`: Open the Add Workspace folder picker.
- `cloudl qoder account [--username name]`: Open the account menu and list items.
- `cloudl qoder more-actions`: Open More Actions and list menu items.

### Composer

- `cloudl qoder prompt-enhance`: Click Prompt Enhance for the current draft.
- `cloudl qoder open-editor`: Open the current draft in Qoder's editor view.

## Notes

Most commands use Qoder's visible desktop UI as the source of truth. Commands that click a button will fail with a typed error if the target control is not visible in the current Qoder view. `send` and `ask` require post-submit evidence from the visible Quest before returning success.
