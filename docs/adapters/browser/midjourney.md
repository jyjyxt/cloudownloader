# Midjourney

**Mode**: 🔐 Browser · **Domain**: `www.midjourney.com`

Generate, inspect, transform, monitor, and download Midjourney creations through the logged-in Chrome session. Paid commands use the website UI or its same-origin API; they do not require a Discord bot token or a private API key.

## Commands

| Command | Description |
|---------|-------------|
| `cloudl midjourney login` | Open a foreground login flow, or report `already_logged_in` |
| `cloudl midjourney whoami` | Check login, plan, and subscription state without exposing account identity |
| `cloudl midjourney settings` | Read selected image/video defaults from Create |
| `cloudl midjourney quota` | Show live Fast GPU minutes, conservative batch estimates, and local trend data |
| `cloudl midjourney generate <prompt>` | Generate images with model routing, references, cost guards, and optional download |
| `cloudl midjourney describe <image>` | Upload one local image and return four Describe suggestions |
| `cloudl midjourney history` | List and filter recent image, video, and derived jobs |
| `cloudl midjourney status <job>` | Read one job's lifecycle and metadata |
| `cloudl midjourney action <job> <operation>` | Rerun, vary, upscale, edit, animate, loop, extend, or cancel |
| `cloudl midjourney download <job>` | Download image originals, raw video, social MP4, or GIF |

## Start safely

```bash
cloudl midjourney login
cloudl midjourney whoami -f json
cloudl midjourney settings -f yaml
cloudl midjourney quota -f yaml

# Validate routing and cost without uploading or submitting
cloudl midjourney generate "a blue ceramic teapot --ar 1:1" --dry-run -f yaml
```

`generate` and paid `action` operations have two independent cost guards:

- `--max-minutes`: reject a command whose conservative estimate is too high.
- `--reserve-minutes`: reject a command that would cross the requested remaining-credit floor.

These are safety estimates, not a billing promise. Use `quota` for the account's live values and compare `estimated_minutes` with `observed_minutes` after real jobs.
Eligible Relax-mode image jobs report `0` estimated Fast GPU minutes because they do not draw down that balance; queue availability and plan rules still apply.

## Generate images

```bash
# V8.2 Standard/SD; downloads all four candidates by default
cloudl midjourney generate \
  "a cobalt glass fox, studio product photography --ar 1:1" \
  --model v8.2 --resolution sd --speed fast

# Submit and return the exact job id without waiting
cloudl midjourney generate "minimalist lighthouse --ar 3:2" \
  --wait false --skip-download

# Higher-resolution V8.2 batch
cloudl midjourney generate "coastal observatory at dusk --ar 16:9" \
  --model v8.2 --resolution hd --max-minutes 1.5
```

Supported structured models are `v8.2`, `v8.1`, `v7`, `v6.1`, `v6`, `niji7`, and `niji6`. `--model auto` respects the selected website version unless a compatibility rule requires a route:

- Omni Reference routes `auto` to V7. An explicit incompatible model fails instead of being silently changed.
- Character Reference (`--cref`) and multi-prompt weights remain available through native prompt parameters on V6/V6.1/Niji 6.
- HD image generation is limited to V8.1/V8.2.
- V8.1/V8.2 Turbo and legacy-only parameters fail before submission.

The positional prompt accepts native Midjourney parameters such as `--ar`, `--seed`, `--stylize`, `--weird`, `--no`, `--tile`, and supported version-specific parameters. The adapter validates combinations it can prove unsafe and leaves the remaining prompt grammar to Midjourney.

## References and personalization

Reference options accept a local PNG/JPEG/WEBP/GIF (up to 10 MB), an HTTPS image URL, or a Midjourney `/jobs/<uuid>?index=N` URL. Local files are uploaded through the logged-in web composer and correlated with the exact upload response.

```bash
# Content/composition reference; repeat the option as a JSON array for multiple files
cloudl midjourney generate "a small robot crossing a salt flat" \
  --image-ref '["./pose.png","https://example.com/light.png"]' \
  --image-weight 1.2

# Style image or numeric Style Reference code
cloudl midjourney generate "botanical field guide" \
  --style-ref ./ink-style.png --style-weight 250

# V7 Omni Reference; auto routing is explicit in routing_reason
cloudl midjourney generate "the same character in a winter station" \
  --omni-ref ./character.png --omni-weight 200 --model auto

# Existing Personalization profile or Moodboard id
cloudl midjourney generate "quiet reading room" --profile <profile-or-moodboard-id>
```

Every paid generation clears any manually pinned/stale web-composer references first. This prevents a no-reference CLI call from inheriting hidden browser state.

## Creation Actions and video

Image jobs support:

`rerun`, `rerun-hd`, `vary-subtle`, `vary-strong`, `upscale-subtle`, `upscale-creative`, `open-editor`, `animate-low`, `animate-high`, `loop-low`, `loop-high`, and `cancel` while active.

Video jobs support `rerun`, `extend-low`, `extend-high`, and `cancel` while active.

```bash
cloudl midjourney action <image-job> vary-subtle --index 1
cloudl midjourney action <image-job> upscale-creative --index 2
cloudl midjourney action <image-job> open-editor --index 1

# Start a video and restore account-wide video defaults afterward
cloudl midjourney action <image-job> animate-high --index 1 \
  --prompt "slow orbit, the subject turns toward the light" \
  --end-frame ./ending.png --video-resolution sd --batch-size 1

cloudl midjourney action <image-job> loop-low --index 1 --batch-size 1
cloudl midjourney action <video-job> extend-high --prompt "the camera rises above the skyline"

# Async submit/cancel lifecycle
cloudl midjourney action <image-job> animate-low --wait false --batch-size 1
cloudl midjourney action <returned-video-job> cancel
```

Video resolution and batch size are account-wide website settings. The adapter requires a readable baseline, applies requested temporary values, and restores the original values even when preparation, submission, or job correlation fails.

## History, status, and downloads

```bash
cloudl midjourney history --limit 20 --type video --status completed
cloudl midjourney history --query "glass fox" -f json
cloudl midjourney status <job> -f yaml

# All image candidates, with validated cache reuse
cloudl midjourney download <image-job> --kind image --index all --output ./midjourney

# Video exports
cloudl midjourney download <video-job> --kind video-raw --index 1
cloudl midjourney download <video-job> --kind video-social --index 1
cloudl midjourney download <video-job> --kind gif --index 1
```

Downloads use atomic writes and validate media bytes before accepting a file. Existing non-empty files are reused only when their magic bytes match the expected format; use `--force` to redownload.

## Quota interpretation

Midjourney subscription quota is measured in Fast GPU minutes, not a fixed image count. A normal image job returns a grid of four candidates, so `sd_batches_remaining` is a batch count, not a single-image count.

The adapter intentionally rounds its guards upward from observed jobs:

| Work | Conservative estimate |
|------|-----------------------|
| Standard/SD image batch | 1 Fast GPU minute |
| HD image batch | 1.5 Fast GPU minutes |
| V7 Omni Reference batch | 2 Fast GPU minutes |
| Subtle/strong variation | up to 1 Fast GPU minute |
| 2× upscale | 2 Fast GPU minutes |
| SD video, batch 1/2/4 | 2 / 4 / 8 Fast GPU minutes |
| HD video, batch 1/2/4 | 7 / 13 / 26 Fast GPU minutes |

For a fresh 200-minute Basic allocation, the conservative upper bounds are about 200 Standard/SD batches (about 800 candidates), 133 HD batches, or 100 Omni batches if the whole allocation were spent on only that operation. Actual consumption varies; reruns, variations, upscales, video, and failed/blocked jobs change the practical total.

## Boundaries

- `open-editor` opens the correct image in Midjourney's editor; inpainting, outpainting, pan, zoom, and canvas edits remain interactive editor work rather than separate CLI commands.
- Existing profile/Moodboard IDs can be passed to `--profile`; profile discovery and Style Explorer browsing are not separate commands.
- `describe` currently accepts a local image only.
- The adapter follows the logged-in website, whose feature availability can change independently of OpenCLI. Use `settings`, `--dry-run`, and typed errors to inspect the current boundary.

## Prerequisites

- Chrome is running with the [Browser Bridge extension](/guide/browser-bridge).
- You are logged into `www.midjourney.com`.
- An active Midjourney subscription is required for generation. Read-only login, settings, history, status, and quota checks do not submit paid jobs.

See also Midjourney's official documentation for [model versions](https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version), [Image Prompts](https://docs.midjourney.com/hc/en-us/articles/32040250122381-Image-Prompts), [Style Reference](https://docs.midjourney.com/hc/en-us/articles/32180011136653-Style-Reference), [Omni Reference](https://docs.midjourney.com/hc/en-us/articles/36285124473997-Omni-Reference), and [video](https://docs.midjourney.com/hc/en-us/articles/37460773864589-Video).
