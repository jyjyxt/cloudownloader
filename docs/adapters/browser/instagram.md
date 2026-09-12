# Instagram

**Mode**: 🔐 Browser · **Domain**: `instagram.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl instagram profile` | Get user profile info |
| `cloudl instagram search` | Search users |
| `cloudl instagram user` | Get recent posts from a user |
| `cloudl instagram explore` | Discover trending posts |
| `cloudl instagram followers` | List user's followers |
| `cloudl instagram following` | List user's following |
| `cloudl instagram saved` | Get your saved posts (or one collection) |
| `cloudl instagram collection-create` | Create a new saved-posts collection |
| `cloudl instagram collection-delete` | Delete a saved-posts collection by name or id |

## Usage Examples

```bash
# View a user's profile
cloudl instagram profile nasa

# Search users
cloudl instagram search nasa --limit 5

# View a user's recent posts
cloudl instagram user nasa --limit 10

# Discover trending posts
cloudl instagram explore --limit 20

# List followers/following
cloudl instagram followers nasa --limit 20
cloudl instagram following nasa --limit 20

# Get your saved posts (default "All posts" feed)
cloudl instagram saved --limit 10

# Get posts from a specific collection (case-insensitive name match)
cloudl instagram saved --collection inspiration --limit 10

# Create a new saved-posts collection
cloudl instagram collection-create "design refs"

# Delete a collection by name (or by numeric id, e.g. 17853899493659567)
cloudl instagram collection-delete "design refs"

# JSON output
cloudl instagram profile nasa -f json
```

### Notes on collections

- `instagram saved` without `--collection` returns the unsegmented "All posts" bucket (same as the original behaviour).
- With `--collection <name>` it resolves the name to an id via `/api/v1/collections/list/`, then fetches `/api/v1/feed/collection/{id}/posts/`. Match is case-insensitive after trimming. An unknown name throws an error that lists the available names.
- `instagram collection-create <name>` calls `POST /api/v1/collections/create/` with a multipart `name` field. Instagram silently accepts duplicate names — the API just returns a new `collection_id` each time, so dedupe client-side if you care.
- `instagram collection-delete <name-or-id>` calls `POST /api/v1/collections/{id}/delete/`. Pass either a case-insensitive collection name or a numeric `collection_id`. If the name resolves to multiple collections (e.g. duplicates from `collection-create`), the adapter throws and lists the candidate ids so you can disambiguate by passing the id explicitly. Unknown names list the available collections in the error message.
- Saving an existing post directly into a named collection in one shot is not exposed by the web app's documented endpoints (`/api/v1/web/save/{pk}/save/` only writes to "All posts"). Use `instagram save` first, then move the post in the UI, or extend with the `/api/v1/collections/{id}/edit/` mutation.

## Prerequisites

- Chrome running and **logged into** instagram.com
- [Browser Bridge extension](/guide/browser-bridge) installed
