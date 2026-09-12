# Dribbble

**Mode**: 🌐 Browser · **Domain**: `dribbble.com`

## Commands

| Command | Description |
|---------|-------------|
| `cloudl dribbble shot <query>` | Search shots by keyword |
| `cloudl dribbble shot-detail <shot>` | Show one shot's authorship, media, palette, and availability |
| `cloudl dribbble designer` | Browse designers and agencies |
| `cloudl dribbble profile <designer>` | Show a designer's public profile and about fields |
| `cloudl dribbble portfolio <designer>` | List a designer's published or liked shots |
| `cloudl dribbble service <designer>` | List and filter a designer's services |
| `cloudl dribbble collection <designer>` | List a designer's public collections |
| `cloudl dribbble member <designer>` | List a team profile's public members |
| `cloudl dribbble whoami` | Show the signed-in Dribbble identity |
| `cloudl dribbble login` | Open Dribbble's sign-in flow |

## Usage Examples

```bash
# Search Dribbble's public popular or New & Noteworthy views
cloudl dribbble shot "mobile ui" --sort popular --limit 10 -f json
cloudl dribbble shot "mobile ui" --sort recent --limit 10 -f json

# The personalized Following view requires a signed-in browser session
cloudl dribbble shot "mobile ui" --sort following --limit 10 -f json

# Inspect a shot and a designer's public surfaces
cloudl dribbble shot-detail 27679566 -f json
cloudl dribbble profile halolab -f json
cloudl dribbble portfolio halolab --type work --limit 10 -f json
cloudl dribbble service halolab --query branding --limit 10 -f json
cloudl dribbble collection halolab --limit 10 -f json
cloudl dribbble member halolab --limit 10 -f json

# Browse designers and verify authentication
cloudl dribbble designer --query product --limit 10 -f json
cloudl dribbble whoami -f json
```

`shot-detail` accepts either a numeric shot id or a full `dribbble.com/shots/...` URL. Designer arguments are Dribbble usernames or profile slugs. List limits must be positive integers and cannot exceed 30.

For `portfolio --type likes`, `designer` identifies each shot's author, not the profile that liked it. It remains empty when Dribbble omits the author label; OpenCLI does not guess ownership.

## Output

Shot commands return stable identity and URL fields plus the metadata visible on Dribbble, such as author, likes, views, media URLs, palette, or work availability. Profile output includes biography, counts, location, membership date, skills, languages, social links, website, and avatar. The remaining list commands preserve rank plus the visible identity and metadata for each service, collection, or team member.

Public reads use Dribbble's server-rendered browser pages. Direct HTTP requests are challenged by AWS WAF, and the official Dribbble API requires a separate OAuth application and token, so the adapter does not depend on a private web API.

## Prerequisites

- Chrome running with the [Browser Bridge extension](/guide/browser-bridge) installed
- A Dribbble login only for `whoami`, `login`, and `shot --sort following`
