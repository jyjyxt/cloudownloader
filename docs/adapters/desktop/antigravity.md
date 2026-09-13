# Antigravity

🔥 **CLI All Electron Apps! The Most Powerful Update Has Arrived!** 🔥

Turn your local Antigravity desktop application into a programmable AI node via Chrome DevTools Protocol (CDP). This allows you to compose complex LLM workflows entirely through the terminal by manipulating the actual UI natively, bypassing any API restrictions.

## Prerequisites

Start the Antigravity desktop app with the Chrome DevTools `remote-debugging-port` flag:

```bash
# Start Antigravity in the background
/Applications/Antigravity.app/Contents/MacOS/Electron \
  --remote-debugging-port=9224
```

> Depending on your installation, the executable might be named differently, e.g., `Antigravity` instead of `Electron`.

Then set the target port:

```bash
export CLOUDL_CDP_ENDPOINT="http://127.0.0.1:9224"
```

## Commands

### `cloudl antigravity status`
Check the Chromium CDP connection. Returns the current window title and active internal URL.

### `cloudl antigravity send <message>`
Send a text prompt to the AI. Automatically locates the Lexical editor input box, types the prompt securely, and hits Enter.

### `cloudl antigravity read`
Scrape the entire current conversation history block as pure text.

### `cloudl antigravity new`
Click the "New Conversation" button to instantly clear the UI state and start fresh.

### `cloudl antigravity dump`
Dump the current DOM and snapshot artifacts to `/tmp` for reverse-engineering and selector debugging.

### `cloudl antigravity extract-code`
Extract any multi-line code blocks from the current conversation view. Ideal for automated script extraction (e.g. `cloudl antigravity extract-code > script.sh`).

### `cloudl antigravity model <name>`
Quickly target and switch the active LLM engine. Example: `cloudl antigravity model claude` or `cloudl antigravity model gemini`.

### `cloudl antigravity watch`
A long-running, streaming process that continuously polls the Antigravity UI for chat updates and outputs them in real-time to standard output.

### `cloudl antigravity serve`
Start an Anthropic-compatible `/v1/messages` proxy server backed by the local Antigravity desktop app.

```bash
cloudl antigravity serve --port 8082
cloudl antigravity serve --timeout 300
CLOUDL_ANTIGRAVITY_TIMEOUT=300 cloudl antigravity serve
```

- `--port <port>`: HTTP listen port, default `8082`
- `--timeout <seconds>`: maximum time to wait for one reply before returning a timeout error, default `120`
- `CLOUDL_ANTIGRAVITY_TIMEOUT`: default timeout in seconds when `--timeout` is not provided

Runtime notes:

- reply polling only reconnects on session-loss style CDP errors such as closed/lost websocket connections
- reconnect attempts are bounded; DOM/logic errors are surfaced directly instead of being retried as reconnects
