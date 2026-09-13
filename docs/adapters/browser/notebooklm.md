# NotebookLM

**Mode**: 🔐 Browser Bridge · **Domain**: `notebook.google.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl notebooklm status` | Check whether NotebookLM is reachable in the current Chrome session |
| `cloudl notebooklm list` | List notebooks visible from the NotebookLM home page |
| `cloudl notebooklm open <notebook>` | Open one notebook in the NotebookLM adapter session by id or URL |
| `cloudl notebooklm current` | Show metadata for the currently opened notebook in the adapter session |
| `cloudl notebooklm get` | Get richer metadata for the current notebook |
| `cloudl notebooklm source-list` | List sources in the current notebook |
| `cloudl notebooklm source-get <source>` | Resolve one source in the current notebook by id or title |
| `cloudl notebooklm source-fulltext <source>` | Fetch extracted source fulltext through NotebookLM RPC |
| `cloudl notebooklm source-guide <source>` | Fetch guide summary and keywords for one source |
| `cloudl notebooklm history` | List conversation history threads for the current notebook |
| `cloudl notebooklm note-list` | List Studio notes visible in the current notebook |
| `cloudl notebooklm notes-get <note>` | Read the currently visible Studio note by title |
| `cloudl notebooklm summary` | Read the current notebook summary |
| `cloudl notebooklm create <title> --execute` | Create a new NotebookLM notebook |
| `cloudl notebooklm add-source <notebook> (--url <url> \| --content <text> \| --file <path>) --execute` | Add one source to an existing notebook |
| `cloudl notebooklm write-note <notebook> --title <title> --content <markdown> --execute` | Create a Studio note in a notebook |
| `cloudl notebooklm generate-audio <notebook> --execute` | Trigger Audio Overview generation for a notebook |
| `cloudl notebooklm generate-slides <notebook> --execute` | Trigger slide deck generation for a notebook |

## Compatibility Aliases

| Alias | Canonical command |
|-------|-------------------|
| `cloudl notebooklm select <notebook>` | `cloudl notebooklm open <notebook>` |
| `cloudl notebooklm metadata` | `cloudl notebooklm get` |
| `cloudl notebooklm notes-list` | `cloudl notebooklm note-list` |

## Positioning

This adapter reuses the existing Cloudl Browser Bridge runtime:

- no custom NotebookLM extension
- no exported cookie replay
- requests and page state stay in the real Chrome session

Read commands expose NotebookLM metadata, sources, notes, summaries, and history from desktop Chrome with an already logged-in Google account. Write commands call NotebookLM's in-page RPC endpoints from that same logged-in browser session and require an explicit `--execute` flag before any remote mutation is attempted.

## Usage Examples

```bash
cloudl notebooklm status
cloudl notebooklm list -f json
cloudl notebooklm open 17e2b882-6a01-4c6c-9262-0738dfa2abee -f json
cloudl notebooklm current -f json
cloudl notebooklm get -f json
cloudl notebooklm source-list -f json
cloudl notebooklm source-get "Quarterly report" -f json
cloudl notebooklm source-guide "Quarterly report" -f json
cloudl notebooklm source-fulltext "Quarterly report" -f json
cloudl notebooklm history -f json
cloudl notebooklm note-list -f json
cloudl notebooklm notes-get "Draft note" -f json
cloudl notebooklm summary -f json

# Write commands refuse to mutate unless --execute is present.
cloudl notebooklm create "Research Brief" --emoji "📒" --execute
cloudl notebooklm add-source 17e2b882-6a01-4c6c-9262-0738dfa2abee --url https://example.com/report --execute
cloudl notebooklm add-source 17e2b882-6a01-4c6c-9262-0738dfa2abee --content "Source text" --title "Pasted source" --execute
cloudl notebooklm add-source 17e2b882-6a01-4c6c-9262-0738dfa2abee --file ./paper.pdf --execute
cloudl notebooklm write-note 17e2b882-6a01-4c6c-9262-0738dfa2abee --title "Open questions" --content "## Next steps" --execute
cloudl notebooklm generate-audio 17e2b882-6a01-4c6c-9262-0738dfa2abee --execute
cloudl notebooklm generate-slides 17e2b882-6a01-4c6c-9262-0738dfa2abee --length 3 --language en --execute
```

## Prerequisites

- Chrome running and logged into Google / NotebookLM
- [Browser Bridge extension](/guide/browser-bridge) installed
- NotebookLM accessible in the current browser session

## Notes

- Notebook-oriented commands run in Cloudl's owned NotebookLM adapter session/window. Use `cloudl notebooklm open <notebook>` first to choose the current notebook for follow-up commands.
- The adapter's semantic strategy is same-origin page fetch against NotebookLM's internal, unstable RPC contract. The manifest's `cookie` label describes the browser session carrier; it is not a stable cookie API.
- `list` uses the active trusted NotebookLM page origin for RPC. It falls back only to valid, non-empty page rows; authentication and an RPC failure with empty fallbacks remain typed failures rather than empty success.
- `get`, `source-list`, `history`, `source-fulltext`, and `source-guide` prefer NotebookLM RPC paths and fall back only when the richer path is unavailable.
- `notes-get` currently reads note content only from the visible Studio note editor; if the note is listed but not open, open it in NotebookLM first and then retry.
- All NotebookLM write commands require `--execute` and fail before opening a browser/RPC write path when it is absent.
- Generated home and notebook URLs use `https://notebook.google.com/`. Notebook targets accept that host and the legacy redirecting `https://notebooklm.google.com/` host for compatibility; suffix/lookalike, non-HTTPS, credentialed, and custom-port URLs are rejected.
- `add-source` accepts exactly one source input: `--url`, `--content`, or `--file`.
