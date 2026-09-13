# Contributing to Cloudl

Thanks for your interest in contributing to Cloudl.

## Quick Start

```bash
# 1. Fork & clone
git clone git@github.com:<your-username>/cloudl.git
cd cloudl

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Run a few checks
npx tsc --noEmit
npm test

# 5. Link globally (optional, for testing `cloudl` command)
npm link
```

## Adding a New Site Adapter

All adapters use TypeScript. Use the pipeline API for data-fetching commands, and `func()` for complex browser interactions.

### Pipeline Adapter (Recommended for data-fetching commands)

Create a file like `clis/<site>/<command>.js`:

```typescript
import { cli, Strategy } from '@jyjyxt/cloudl/registry';

cli({
  site: 'mysite',
  name: 'trending',
  description: 'Trending posts on MySite',
  domain: 'www.mysite.com',
  strategy: Strategy.PUBLIC,
  access: 'read',
  browser: false,
  args: [
    { name: 'query', positional: true, required: true, help: 'Search keyword' },
    { name: 'limit', type: 'int', default: 20, help: 'Number of items' },
  ],
  columns: ['rank', 'title', 'score', 'url'],
  pipeline: [
    { fetch: { url: 'https://api.mysite.com/trending' } },
    { map: {
        rank: '${{ index + 1 }}',
        title: '${{ item.title }}',
        score: '${{ item.score }}',
        url: '${{ item.url }}',
    }},
    { limit: '${{ args.limit }}' },
  ],
});
```

See [`hackernews/top.js`](clis/hackernews/top.js) for a real example.

### func() Adapter (For complex browser interactions)

Create a file like `clis/<site>/<command>.js`:

```typescript
import { cli, Strategy } from '@jyjyxt/cloudl/registry';

cli({
  site: 'mysite',
  name: 'search',
  description: 'Search MySite',
  domain: 'www.mysite.com',
  strategy: Strategy.COOKIE,
  args: [
    { name: 'query', positional: true, required: true, help: 'Search query' },
    { name: 'limit', type: 'int', default: 10, help: 'Max results' },
  ],
  columns: ['title', 'url', 'date'],

  func: async (page, kwargs) => {
    const { query, limit = 10 } = kwargs;
    await page.goto('https://www.mysite.com');

    const data = await page.evaluate(async (q: string) => {
      const res = await fetch('/api/search?q=' + encodeURIComponent(q), {
        credentials: 'include'
      });
      return (await res.json()).results;
    }, query);

    return data.slice(0, Number(limit)).map((item: any) => ({
      title: item.title,
      url: item.url,
      date: item.created_at,
    }));
  },
});
```

Install the [`cloudl-adapter-author` skill](./skills/cloudl-adapter-author/SKILL.md) if you need the full adapter workflow — recon → API discovery → field decoding → `cloudl browser verify`.

### Validate Your Adapter

```bash
# Validate adapter
cloudl validate

# Test your command
cloudl <site> <command> --limit 3 -f json

# Verbose mode for debugging
cloudl <site> <command> -v
```

## Arg Design Convention

Use **positional** for the primary, required argument of a command (the "what" — query, symbol, id, url, username). Use **named options** (`--flag`) for secondary/optional configuration (limit, format, sort, page, filters, language, date).

**Rule of thumb**: Think about how the user will type the command. `cloudl xueqiu stock SH600519` is more natural than `cloudl xueqiu stock --symbol SH600519`.

| Arg type | Positional? | Examples |
|----------|-------------|----------|
| Main target (query, symbol, id, url, username) | ✅ `positional: true` | `search '茅台'`, `stock SH600519`, `download BV1xxx` |
| Configuration (limit, format, sort, page, type, filters) | ❌ Named `--flag` | `--limit 10`, `--format json`, `--sort hot`, `--location seattle` |

Do **not** convert an argument to positional just because it appears first in the file. If the argument is optional, acts like a filter, or selects a mode/configuration, it should usually stay a named option.

Pipeline example:
```typescript
args: [
  { name: 'query', positional: true, required: true, help: 'Search query' },  // ← primary arg
  { name: 'limit', type: 'int', default: 20, help: 'Max results' },           // ← config arg
]
```

TS example:
```typescript
args: [
  { name: 'query', positional: true, required: true, help: 'Search query' },
  { name: 'limit', type: 'int', default: 10, help: 'Max results' },
]
```

## Testing

See [TESTING.md](./TESTING.md) for the full guide and exact test locations.

```bash
npm test                      # Default local gate: unit + extension + adapter tests
npm run test:adapter          # Adapter-only project (useful while iterating on adapters)
npx vitest run tests/e2e/     # E2E tests
npx vitest run                # All tests
```

## Code Style

- **TypeScript strict mode** — avoid `any` where possible.
- **ES Modules** — use `.js` extensions in imports (TypeScript output).
- **Naming**: `kebab-case` for files, `camelCase` for variables/functions, `PascalCase` for types/classes.
- **No default exports** — use named exports.

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(twitter): add thread command
fix(browser): handle CDP timeout gracefully
docs: update CONTRIBUTING.md
test(reddit): add e2e test for save command
chore: bump vitest to v4
```

Common scopes: site name (`twitter`, `reddit`) or module name (`browser`, `pipeline`, `engine`).

## Submitting a Pull Request

1. Create a feature branch: `git checkout -b feat/mysite-trending`
2. Make your changes and add tests when relevant
3. Run the checks that apply:
   ```bash
   npx tsc --noEmit           # Type check
   npm test                   # Default local gate: unit + extension + adapter
   npm run test:adapter       # Adapter-only project (optional while iterating on adapters)
   cloudl validate           # Adapter validation
   ```
4. Commit using conventional commit format
5. Push and open a PR

## License

By contributing, you agree that your contributions will be licensed under the [Apache-2.0 License](./LICENSE).
