# Google Scholar

**Mode**: 🌐 Public · **Domain**: `scholar.google.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl google-scholar search <query>` | Search Google Scholar papers by keyword |
| `cloudl google-scholar cite <query>` | Fetch a citation export for a Scholar search result |
| `cloudl google-scholar profile <author>` | Open an author profile and list top papers |

## Usage Examples

```bash
cloudl google-scholar search "transformer"
cloudl google-scholar search "retrieval augmented generation" --limit 5
cloudl google-scholar cite "attention is all you need" --style bibtex
cloudl google-scholar profile "Yann LeCun" --limit 5
```

## Notes

- Uses browser DOM extraction over public Google Scholar results
- Availability can vary by region or anti-bot challenges
