# IMDb

**Mode**: 🌐 Public (Browser) · **Domain**: `www.imdb.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl imdb search` | Search movies, TV shows, and people |
| `cloudl imdb title` | Get movie or TV show details |
| `cloudl imdb top` | IMDb Top 250 Movies |
| `cloudl imdb trending` | IMDb Most Popular Movies |
| `cloudl imdb person` | Get actor or director info |
| `cloudl imdb reviews` | Get user reviews for a title |

## Usage Examples

```bash
# Search for a movie
cloudl imdb search "inception" --limit 10

# Get movie details
cloudl imdb title tt1375666

# Get TV series details (also accepts full URL)
cloudl imdb title "https://www.imdb.com/title/tt0903747/"

# Top 250 movies
cloudl imdb top --limit 20

# Currently trending movies
cloudl imdb trending --limit 10

# Actor/director info with filmography
cloudl imdb person nm0634240 --limit 5

# User reviews
cloudl imdb reviews tt1375666 --limit 5

# JSON output
cloudl imdb top --limit 5 -f json
```

## Prerequisites

- Chrome with Browser Bridge extension installed
- No login required (all data is public)
