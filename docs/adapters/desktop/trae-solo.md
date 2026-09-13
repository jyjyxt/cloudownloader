# Trae SOLO

Control **Trae SOLO** from Cloudl through the Electron debug port and read its local VSCode-style state files.

**Mode**: Desktop app / local filesystem · **App**: `TRAE SOLO`

## Commands

| Command | Description | Access |
|---------|-------------|--------|
| `cloudl trae-solo status` | Check whether the Trae SOLO desktop app is reachable | read |
| `cloudl trae-solo history` | List visible projects and tasks from the Trae SOLO sidebar | read |
| `cloudl trae-solo model [name]` | Read, list, or switch the active model in an open task | write when switching |
| `cloudl trae-solo mode [code\|work]` | Read or switch between Code and Work mode | write when switching |
| `cloudl trae-solo automation-list` | Read visible Automation tab entries | read |
| `cloudl trae-solo skill-list` | List marketplace or installed skills from the Skills panel | read |
| `cloudl trae-solo skill-search <keyword>` | Search visible marketplace skills | read |
| `cloudl trae-solo skill-category [name]` | List or filter marketplace skill categories | read |
| `cloudl trae-solo storage-keys` | List renderer `localStorage` / `sessionStorage` keys | read |
| `cloudl trae-solo storage-get <key>` | Read a renderer storage value | read |
| `cloudl trae-solo cookies` | List JavaScript-visible renderer cookies with truncated previews | read |
| `cloudl trae-solo idb-list` | List renderer IndexedDB database names | read |
| `cloudl trae-solo state-keys` | List keys in Trae SOLO `state.vscdb` | read |
| `cloudl trae-solo state-get <key>` | Read a key from `state.vscdb` | read |
| `cloudl trae-solo recent-workspaces` | Show recently opened workspaces from local state | read |
| `cloudl trae-solo workspaces-list` | List workspaceStorage entries and resolved workspace targets | read |
| `cloudl trae-solo extensions-list` | List installed VSCode-compatible extensions | read |
| `cloudl trae-solo task-fs-list` | List on-disk Trae SOLO task ids | read |
| `cloudl trae-solo task-fs-turns <task-id>` | List chat-turn git tags for a task snapshot | read |
| `cloudl trae-solo task-fs-show <task-id>` | Show the workspace tree at a chat-turn ref | read |
| `cloudl trae-solo skill-fs-list` | List local skill directories under `~/.trae/skills` | read |
| `cloudl trae-solo skill-fs-installed` | List skills registered in `skill-config.json` | read |
| `cloudl trae-solo skill-fs-show <name>` | Show a local skill's `SKILL.md` head and metadata | read |
| `cloudl trae-solo settings-read` | Read user `settings.json` with JSONC comments/trailing commas | read |
| `cloudl trae-solo user-rules` | Read `~/.trae/user_rules.md` | read |

Write-side UI commands that only proved button clicks were intentionally left out. New task creation, task open/navigation, message actions, skill install/uninstall/run/toggle, automation creation, and filesystem deletion need explicit postconditions before they can be exposed safely.

## Examples

```bash
cloudl trae-solo status
cloudl trae-solo history --limit 20
cloudl trae-solo model --list true
cloudl trae-solo model "Claude"
cloudl trae-solo mode work

cloudl trae-solo skill-search "python"
cloudl trae-solo automation-list --tab task-template

cloudl trae-solo state-keys --filter workbench
cloudl trae-solo recent-workspaces
cloudl trae-solo task-fs-list --limit 20
```

## Notes

- Electron UI commands require Trae SOLO to be running with the configured CDP port. Cloudl launches registered Electron apps with the app-specific debug port when needed.
- Renderer storage reads come from the current Electron renderer and may be empty if the app has not loaded the relevant workspace.
- Filesystem reads are local-only and read Trae SOLO state under `~/.trae` and `~/Library/Application Support/TRAE SOLO`.
- `model` and `mode` verify the visible post-action state before returning success.
