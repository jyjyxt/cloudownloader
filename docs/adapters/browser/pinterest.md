# Pinterest

**Mode**: 🔐 Browser · **Domain**: `pinterest.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl pinterest search-pins` | Search pins on Pinterest |
| `cloudl pinterest search-boards` | Search for boards on Pinterest |
| `cloudl pinterest search-users` | Search for users on Pinterest |
| `cloudl pinterest pin` | Get details of a Pinterest pin |
| `cloudl pinterest user` | Get a Pinterest user's public profile stats |
| `cloudl pinterest user-pins` | List pins created by a Pinterest user |
| `cloudl pinterest user-boards` | List a user's boards |
| `cloudl pinterest board-pins` | List pins inside a Pinterest board |
| `cloudl pinterest board-sections` | List the sections inside a Pinterest board |
| `cloudl pinterest download` | Download a pin's original image to disk |
| `cloudl pinterest save` | Save a pin to your profile or a board |
| `cloudl pinterest create-pin` | Upload a local image and publish it through the Pinterest web UI |
| `cloudl pinterest pin-create` | Create a pin from a remote image URL onto a board |
| `cloudl pinterest pin-update` | Update a pin's title, description, link, or board |
| `cloudl pinterest pin-delete` | Delete one of your own pins |
| `cloudl pinterest board-create` | Create a new board on your account |
| `cloudl pinterest board-update` | Update the name, description, or privacy of your board |
| `cloudl pinterest board-delete` | Delete one of your own boards |
| `cloudl pinterest board-section-create` | Create a section inside one of your boards |
| `cloudl pinterest board-section-delete` | Delete a section from one of your boards |

## Usage Examples

### Read

```bash
# Search
cloudl pinterest search-pins "nordic interior" --limit 10
cloudl pinterest search-boards "coffee" --limit 10
cloudl pinterest search-users "coffee" --limit 10

# A user's profile, pins, and boards
cloudl pinterest user janedoe
cloudl pinterest user-pins janedoe --limit 10
cloudl pinterest user-boards janedoe --limit 50 --sort alphabetical

# A board's pins and sections
cloudl pinterest board-pins janedoe/my-board --limit 10
cloudl pinterest board-sections janedoe/my-board

# A single pin, and downloading its original image
cloudl pinterest pin 1234567890123456
cloudl pinterest download 1234567890123456 --output ~/Downloads/pins

# JSON output
cloudl pinterest search-pins "coffee" -f json
```

Boards are addressed by `<username>/<slug>`, a board URL, or the numeric `boardId` from
`user-boards`; sections by their slug or id from `board-sections`.

### Write

```bash
# Save (repin) an existing pin — omit --board to save to your profile
cloudl pinterest save 1234567890123456
cloudl pinterest save 1234567890123456 --board janedoe/my-board --section my-section

# Create a pin from an image URL
cloudl pinterest pin-create "https://example.com/image.jpg" \
  --board janedoe/my-board --title "My pin" --link "https://example.com"

# Upload a local image through the visible Pinterest composer
cloudl pinterest create-pin \
  --image ./cover.jpg \
  --board "Ideas" \
  --title "Launch notes" \
  --description "A visual summary" \
  --link "https://example.com/post" \
  --alt-text "Notebook page with launch notes"

# Update a pin (text, or move it to another board/section)
cloudl pinterest pin-update 1234567890123456 --title "New title"
cloudl pinterest pin-update 1234567890123456 --board janedoe/other-board --section my-section

# Boards and sections
cloudl pinterest board-create "My board" --description "..." --privacy secret
cloudl pinterest board-update janedoe/my-board --name "Renamed" --privacy public
cloudl pinterest board-section-create janedoe/my-board --title "My section"
```

### Destructive commands

Deletes require `--confirm`. Without it the command prints what it *would* delete and exits
non-zero without touching anything.

```bash
cloudl pinterest pin-delete 1234567890123456            # preview only
cloudl pinterest pin-delete 1234567890123456 --confirm   # actually delete

cloudl pinterest board-delete janedoe/my-board            # preview (shows the board's pin count)
cloudl pinterest board-delete janedoe/my-board --confirm   # deletes the board *and its pins*

cloudl pinterest board-section-delete janedoe/my-board --section my-section --confirm
```

## Notes

- **Reads work without logging in.** Search, pin, user, and board commands run fine on a
  logged-out Chrome session. Only the write commands need a Pinterest login; if the CSRF token
  is missing or stale, reload Pinterest in Chrome and retry.
- **`pin-create` needs a fetchable image URL.** Pinterest scrapes the URL server-side, so it
  must return the image itself — HTML page URLs and hotlink-protected hosts fail with
  `HTTP 400 ... check the URL`. Pinterest also derives its own description for scraped pins,
  so `--description` may be ignored.
- **`create-pin` uploads a local image through the visible composer.** It requires Chrome to
  be logged into Pinterest, the Browser Bridge extension with file upload support, and an
  existing board selectable by name. Verification challenges, captchas, disabled publish
  buttons, and account restrictions are reported instead of bypassed.
- **Sections are only settable by a follow-up move.** Pinterest's create endpoints accept a
  section key, answer `HTTP 200`, and file the pin at the board root anyway; only
  `PinResource/update` honours it. So `save --section` and `pin-create --section` create the pin
  and then move it. If that second step fails, the command errors with the id of the pin it
  already created rather than reporting success.
- **`--description ""` clears the field; `--link` may be refused.** Omitting a flag leaves the
  field alone, and passing an empty string clears it. Pinterest rejects link edits on pins it
  scraped for you (`Pinterest refused this write: 你無權存取該資源`), so `--link` only works on
  pins whose link is yours.
- **`save` without `--board`** posts a boardless repin, which Pinterest files under your
  profile's "Quick saves" board. `pin-create` cannot do this — creating a *new* pin always
  requires a board.
- **`user`'s `followingCount` includes topics.** It is Pinterest's own total, covering followed
  people *and* followed topics; `interestFollowingCount` is the topic-only part.
