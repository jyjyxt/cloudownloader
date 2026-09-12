# Amazon

**Mode**: 🔐 Browser · **Domain**: `amazon.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl amazon bestsellers [<best-sellers-url>]` | Read Amazon Best Sellers pages for ranked candidate discovery |
| `cloudl amazon search "<query>"` | Read Amazon search results for coarse filtering |
| `cloudl amazon product <asin-or-url>` | Read a product page with title, price, rating, breadcrumbs, and bullets |
| `cloudl amazon offer <asin-or-url>` | Read seller / fulfillment / buy-box facts from the product page |
| `cloudl amazon discussion <asin-or-url>` | Read review summary and sample customer reviews |
| `cloudl amazon movers-shakers [<url>]` | Amazon Movers & Shakers pages for short-term growth signals |
| `cloudl amazon new-releases [<url>]` | Amazon New Releases pages for early momentum discovery |

## Usage Examples

```bash
# Root Best Sellers page
cloudl amazon bestsellers https://www.amazon.com/Best-Sellers/zgbs --limit 10 -f json

# Category-specific Best Sellers page
cloudl amazon bestsellers "<category-best-sellers-url>" --limit 50 -f json

# Search products
cloudl amazon search "desk shelf organizer" --limit 20 -f json

# Validate one product
cloudl amazon product B0FJS72893 -f json

# Validate seller / offer facts
cloudl amazon offer B0FJS72893 -f json

# Read review summary + samples
cloudl amazon discussion B0FJS72893 --limit 5 -f json
```

## Prerequisites

- Chrome running with an active `amazon.com` session in the shared profile
- [Browser Bridge extension](/guide/browser-bridge) installed

## Notes

- This adapter only returns fields visible on public Amazon pages.
- `bestsellers`, `movers-shakers`, `new-releases`, and `search` are for candidate discovery; `product`, `offer`, and `discussion` are the validation surfaces.
- `offer` is the right surface for `sold_by`, `ships_from`, and Amazon-retail exclusion.
- `discussion` may return review data even when Q&A is absent. Missing Q&A is a normal outcome, not an error.
- A product or review URL from a sibling marketplace (`amazon.co.uk`, `amazon.de`, `amazon.com.au`, …) is read on that marketplace, and the emitted URLs stay on it. A bare ASIN still defaults to `amazon.com`.

## Troubleshooting

- If Amazon shows a robot-check page, clear it in Chrome and retry.
- If CDP is attached to the wrong tab, retry with `OPENCLI_CDP_TARGET=amazon.com`.
- Avoid running multiple Amazon browser commands in parallel against the same shared Chrome target.
