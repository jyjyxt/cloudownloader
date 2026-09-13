# AI Workflow

Cloudl is designed for AI agents writing adapters. The workflow is built on a small set of browser primitives plus a skill that teaches the end-to-end loop.

## The Loop

From a new site URL to a passing `cloudl browser verify` — one skill, one set of primitives:

```bash
# 1. Pick up the skill (Claude Code)
#    skills/cloudl-adapter-author/SKILL.md

# 2. Reconnaissance
cloudl browser analyze https://example.com
# Fallback primitives when analyze says deeper inspection is needed:
# cloudl browser open https://example.com
# cloudl browser network      # inspect XHR / fetch calls
# cloudl browser state        # extract __INITIAL_STATE__ / __NEXT_DATA__

# 3. Scaffold + verify
cloudl browser init <site>/<name>
cloudl browser verify <site>/<name>
```

The skill `cloudl-adapter-author` walks through: coverage self-test → site recon → API discovery → field decoding → output design → adapter coding → verify → write-back to site memory.

See [skills/cloudl-adapter-author/SKILL.md](https://github.com/jyjyxt/cloudownloader/blob/main/skills/cloudl-adapter-author/SKILL.md).

## Primitives

| Command | Purpose |
|---------|---------|
| `cloudl doctor` | Sanity check: bridge, Chrome, signals |
| `cloudl browser analyze <url>` | One-shot site recon: anti-bot, pattern, nearest adapter, next step |
| `cloudl browser open <url>` | Open a tab in the Chrome session |
| `cloudl browser network` | List recent XHR / fetch calls |
| `cloudl browser state` | Page state: URL, title, interactive elements |
| `cloudl browser eval '<expr>'` | Evaluate JS in the page context (cookies + origin honored) |
| `cloudl browser init <site>/<name>` | Scaffold `~/.cloudl/clis/<site>/<name>.js` |
| `cloudl browser verify <site>/<name>` | Run the adapter and print first rows |

No `explore` / `synthesize` / `generate` / `cascade` command. The skill drives the loop — the primitives are small and composable.

## Site Memory

Every site accumulates knowledge at `~/.cloudl/sites/<site>/` (endpoints, field decode map, notes, response fixtures). The adapter-author skill reads memory on Step 2 and writes back on Step 12 — see `skills/cloudl-adapter-author/references/site-memory.md` for the schema.

In-repo seeds for well-known sites live at `skills/cloudl-adapter-author/references/site-memory/<site>.md` (eastmoney / xueqiu / bilibili / tonghuashun already covered).

## Authentication Strategies

Adapters declare one of:

1. **PUBLIC** — direct fetch, no credentials
2. **COOKIE** — reuse Chrome session cookies (`browser: true` + `credentials: 'include'`)
3. **INTERCEPT** — let the page make the request; capture the response
4. **UI** — drive the authenticated browser UI when no stable API is available

Pick per the `coverage-matrix.md` and `api-discovery.md` references inside the skill.

## When Something Breaks

- Verify failure → run `cloudl doctor`, then consult `skills/cloudl-autofix/SKILL.md`
- Field values wrong → jump back to `skills/cloudl-adapter-author/references/field-decode-playbook.md`
- Endpoint returns 401/403 → `api-discovery.md` §4 (token) / §5 (intercept)
