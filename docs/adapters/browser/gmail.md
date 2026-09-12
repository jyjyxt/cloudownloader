# Gmail

**Mode**: 🔐 Browser · **Domain**: `mail.google.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl gmail whoami` | Show the signed-in Gmail identity |
| `cloudl gmail login` | Open Gmail's Google sign-in flow |
| `cloudl gmail search <query>` | Search threads with Gmail search syntax |
| `cloudl gmail inbox` | List inbox threads |
| `cloudl gmail unread` | List unread threads |
| `cloudl gmail starred` | List starred threads |
| `cloudl gmail sent` | List sent threads |
| `cloudl gmail drafts` | List draft threads |
| `cloudl gmail trash` | List trashed threads |
| `cloudl gmail spam` | List spam threads |
| `cloudl gmail snoozed` | List snoozed threads |
| `cloudl gmail important` | List important threads |
| `cloudl gmail labels` | List system and user labels |
| `cloudl gmail thread <thread>` | Read all messages in a thread |
| `cloudl gmail attachments <thread>` | List attachment metadata for a thread |

## Usage Examples

```bash
# Search and use the returned threadId to read a conversation
cloudl gmail search 'from:alerts@example.com newer_than:30d' --limit 20 -f json
cloudl gmail thread 'thread-f:1234567890123456789' -f json

# Common mailbox views and labels
cloudl gmail inbox --limit 50
cloudl gmail unread --limit 50
cloudl gmail labels -f json

# List attachment metadata without downloading files
cloudl gmail attachments 'thread-f:1234567890123456789' -f json
```

All list commands accept `--account <index>` for Gmail URLs under `/mail/u/<index>/`. Thread-list commands also accept `--limit` from 1 to 200.

## Output

Search and mailbox views return thread identity, subject, sender, snippet, message count, unread/starred flags, timestamp, and Gmail label ids. `thread` returns one row per message, including recipients, body text, and an attachment array. `attachments` flattens that array to one row per file.

Reads let Gmail perform its normal search/navigation and parse the resulting browser response. Recently cached threads may use the already rendered message containers instead. The adapter does not reconstruct Gmail's private authentication or write requests.

## Prerequisites

- Chrome running and **logged into** Gmail
- [Browser Bridge extension](/guide/browser-bridge) installed
- Use `cloudl gmail whoami` to verify the active account before reading mail
