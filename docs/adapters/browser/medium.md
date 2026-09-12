# Medium

**Mode**: Mixed · **Domain**: `medium.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl medium feed` | Get hot Medium posts, optionally scoped to a topic |
| `cloudl medium search` | Search Medium posts by keyword |
| `cloudl medium user` | Get recent articles by a user |
| `cloudl medium tag <tag>` | Latest articles for a Medium tag (public RSS, no browser) |
| `cloudl medium login` | Open the Medium sign-in page and wait for the browser session to authenticate |
| `cloudl medium whoami` | Confirm the active Medium account |
| `cloudl medium draft-create <content> --title <title> [--image <paths>]` | Create and confirm an autosaved Medium story draft with optional inline images |
| `cloudl medium publish <content> --title <title>` | Write and immediately publish a Medium story |

## Usage Examples

```bash
# Get the general Medium feed
cloudl medium feed --limit 10

# Search posts by keyword
cloudl medium search ai

# Get articles by a user
cloudl medium user @username

# Topic feed as JSON
cloudl medium feed --topic programming -f json

# Latest articles for a tag (public RSS — fastest, no browser)
cloudl medium tag programming --limit 10
cloudl medium tag artificial-intelligence --limit 20

# Write and publish a story from the authenticated Chrome session
cloudl medium publish "The complete story body." --title "A practical title" --tags ai,writing

# Create a draft without opening Medium's publish dialog
cloudl medium draft-create "The complete story body." --title "A practical title" --image /tmp/diagram.png
```

`publish` fills Medium's `/new-story` editor, opens the publishing dialog, applies optional topic tags, and returns the story URL only after Medium redirects away from the editor.

`draft-create` fills the same editor and waits for Medium's autosave acknowledgement (or a draft edit URL). `--image` accepts one local image path or a comma-separated list; images are inserted at the end of the story and each upload is verified before the draft is confirmed. It does not open the publishing dialog. `draft_create` is accepted as a compatibility alias.

## `tag` columns

`rank, title, author, description, categories, published, url`

- `description` is the full RSS `<description>` (no silent truncation; pipe through `head` if you want a preview).
- `categories` is comma-joined Medium tags from each item's `<category>` blocks.
- `published` is the original `pubDate` ISO string when available.

## Prerequisites

- `cloudl medium search` and `cloudl medium tag` can run without a browser (the latter parses `medium.com/feed/tag/<tag>` RSS)
- `cloudl medium feed` and `cloudl medium user` require Browser Bridge access to `medium.com`
- `cloudl medium draft-create` and `cloudl medium publish` require a logged-in Medium browser session; run `cloudl medium login` first when needed.
