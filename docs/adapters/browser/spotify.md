# Spotify

**Mode**: 🔑 OAuth API · **Domains**: `accounts.spotify.com`, `api.spotify.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl spotify auth` | Authenticate with Spotify and store tokens locally |
| `cloudl spotify status` | Show current playback status |
| `cloudl spotify play [query]` | Resume playback or search-and-play a track |
| `cloudl spotify pause` | Pause playback |
| `cloudl spotify next` | Skip to the next track |
| `cloudl spotify prev` | Skip to the previous track |
| `cloudl spotify volume <0-100>` | Set playback volume |
| `cloudl spotify search <query>` | Search Spotify tracks |
| `cloudl spotify queue <query>` | Add a track to the playback queue |
| `cloudl spotify shuffle <on|off>` | Toggle shuffle |
| `cloudl spotify repeat <off|track|context>` | Set repeat mode |

## Usage Examples

```bash
# First-time setup
cloudl spotify auth

# What is playing right now?
cloudl spotify status

# Resume playback
cloudl spotify play

# Search and immediately play a track
cloudl spotify play "Numb Linkin Park"

# Search without playing
cloudl spotify search "Daft Punk" --limit 5 -f json

# Queue a track
cloudl spotify queue "Get Lucky"

# Playback controls
cloudl spotify pause
cloudl spotify next
cloudl spotify prev
cloudl spotify volume 35
cloudl spotify shuffle on
cloudl spotify repeat track
```

## Setup

1. Create a Spotify app at <https://developer.spotify.com/dashboard>
2. Add `http://127.0.0.1:8888/callback` to the app's Redirect URIs
3. Fill in `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in `~/.cloudl/spotify.env`
4. Run `cloudl spotify auth`

## Notes

- Browser Bridge is not required.
- Tokens are stored locally at `~/.cloudl/spotify-tokens.json`.
- Playback commands work best when you already have an active Spotify device/session.
