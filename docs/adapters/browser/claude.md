# Claude

**Mode**: Browser · **Domain**: `claude.ai`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl claude ask <prompt>` | Send a prompt and get the response |
| `cloudl claude send <prompt>` | Send a prompt without waiting for the response |
| `cloudl claude new` | Start a new conversation |
| `cloudl claude status` | Check login state and page availability |
| `cloudl claude read` | Read the current conversation |
| `cloudl claude history` | List recent conversations from `/recents` |
| `cloudl claude detail <id>` | Open a conversation by ID and read its messages |

## Usage Examples

```bash
# Ask a question
cloudl claude ask "explain quicksort in 3 sentences"

# Start a new chat before asking
cloudl claude ask "hello" --new

# Pick the model (default: sonnet; opus is paid-tier)
cloudl claude ask "quick summary" --model haiku

# Enable Adaptive thinking
cloudl claude ask "prove that sqrt(2) is irrational" --think

# Attach a file (image / PDF / text, up to ~1 MB raw)
cloudl claude ask "describe this image" --file ./photo.png

# Combine modes
cloudl claude ask "what does this PDF cover?" --file ./paper.pdf --think --new

# Custom timeout (default: 120s)
cloudl claude ask "write a long essay" --timeout 240

# JSON output
cloudl claude ask "hello" -f json
```

### Options (ask)

| Option | Description |
|--------|-------------|
| `<prompt>` | The message to send (required, positional) |
| `--timeout` | Wait timeout in seconds (default: 120) |
| `--new` | Start a new chat before sending (default: false) |
| `--model` | Model to use: `sonnet`, `opus`, or `haiku` (default: sonnet) |
| `--think` | Enable Adaptive thinking (default: false) |
| `--file` | Attach a file (image, PDF, text) with the prompt |

## Prerequisites

- Chrome running with [Browser Bridge extension](/guide/browser-bridge) installed
- Logged in to [claude.ai](https://claude.ai)

## Caveats

- This adapter drives the Claude web UI in the browser, not an API
- Claude commands default to persistent site sessions, so consecutive `claude ask` / `claude read` / `claude detail` invocations continue in the same Claude page. Pass `--site-session ephemeral` for a one-shot tab.
- `--model opus` requires a paid Claude plan; on a free-tier account the adapter surfaces a usage error rather than silently falling back
- The default Sonnet 4.6 model uses Adaptive thinking by default; `--think` is the explicit switch but Claude may still invoke thinking for complex prompts even when not requested
- Adaptive-thinking and file-thumbnail widgets render duplicated label paragraphs (`Thought process` / `View uploaded image`) at the top of the response; these are stripped automatically so the row value is the actual answer
- File upload is constrained by the daemon HTTP body limit (1 MB; `src/daemon.ts:152`); files up to ~700 KB raw work reliably, larger files (e.g. high-res images) may fail with `ECONNRESET`
- Long responses (code, essays) may need a higher `--timeout`
