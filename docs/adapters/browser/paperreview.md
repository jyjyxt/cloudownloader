# paperreview.ai

**Mode**: 🌐 Public · **Domain**: `paperreview.ai`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl paperreview submit` | Submit a PDF to paperreview.ai for review |
| `cloudl paperreview review` | Fetch a review by token |
| `cloudl paperreview feedback` | Send feedback on a completed review |

## Usage Examples

```bash
# Validate a local PDF without uploading it
cloudl paperreview submit ./paper.pdf --email you@example.com --venue RAL --dry-run true

# Request an upload slot but stop before the actual upload
cloudl paperreview submit ./paper.pdf --email you@example.com --venue RAL --prepare-only true

# Submit a paper for review
cloudl paperreview submit ./paper.pdf --email you@example.com --venue RAL -f json

# Check the review status or fetch the final review
cloudl paperreview review tok_123 -f json

# Submit feedback on the review quality
cloudl paperreview feedback tok_123 --helpfulness 4 --critical-error no --actionable-suggestions yes
```

## Prerequisites

- No browser required — uses public paperreview.ai endpoints
- The input file must be a local `.pdf`
- paperreview.ai currently rejects files larger than `10MB`
- `submit` requires `--email`; `--venue` is optional

## Notes

- `submit` returns both the review token and the review URL when submission succeeds
- `review` returns `processing` until the paperreview.ai result is ready
- `feedback` expects `yes` / `no` values for `--critical-error` and `--actionable-suggestions`
