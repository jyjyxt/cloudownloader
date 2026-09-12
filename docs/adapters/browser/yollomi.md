# Yollomi

**Mode**: 🔐 Browser · **Domain**: `yollomi.com`

AI image/video generation and editing on [yollomi.com](https://yollomi.com). Uses the same `/api/ai/*` routes as the web app; authentication is your **logged-in Chrome session** (NextAuth cookies).

## Commands

| Command | Description |
|---------|-------------|
| `cloudl yollomi generate` | Text-to-image / image-to-image |
| `cloudl yollomi video` | Text-to-video / image-to-video |
| `cloudl yollomi edit` | Qwen image edit (prompt + image) |
| `cloudl yollomi upload` | Upload a local file → public URL for other commands |
| `cloudl yollomi models` | List image / video / tool models and credit costs |
| `cloudl yollomi remove-bg` | Remove background (free) |
| `cloudl yollomi upscale` | Image upscaling |
| `cloudl yollomi face-swap` | Face swap between two images |
| `cloudl yollomi restore` | Photo restoration |
| `cloudl yollomi try-on` | Virtual try-on |
| `cloudl yollomi background` | AI background for product/object images |
| `cloudl yollomi object-remover` | Remove objects (image + mask URLs) |

## Usage Examples

```bash
# List models
cloudl yollomi models --type image

# Text-to-image (default model: z-image-turbo)
cloudl yollomi generate "a red apple on a wooden table"

# Choose model and aspect ratio
cloudl yollomi generate "sunset" --model flux-schnell --ratio 16:9

# Image-to-image: upload first, then pass URL
cloudl yollomi upload ./photo.png
cloudl yollomi generate "oil painting style" --model flux-2-pro --image "https://..."

# Video
cloudl yollomi video "waves on a beach" --model kling-2-1

# Tools
cloudl yollomi remove-bg https://example.com/image.png
cloudl yollomi upscale https://example.com/image.png --scale 4
cloudl yollomi edit https://example.com/in.png "make it vintage"
```

### Common options

| Option | Applies to | Description |
|--------|------------|-------------|
| `--model` | `generate`, `video` | Model id (see `yollomi models`) |
| `--ratio` | `generate`, `video` | Aspect ratio, e.g. `1:1`, `16:9` |
| `--image` | `generate`, `video` | Image URL for img2img / i2v |
| `--output` | Most | Output directory (default `./yollomi-output`) |
| `--no-download` | Several | Print URLs only, skip saving files |

## Prerequisites

- Chrome running and **logged into** [yollomi.com](https://yollomi.com) (Google OAuth)
- [Browser Bridge extension](/guide/browser-bridge) installed; daemon connects on first command

The CLI ensures the automation tab is on `yollomi.com` before calling APIs (same-origin `fetch` with session cookies).

## Notes

- **Credits**: Each model consumes account credits; insufficient credits returns HTTP 402.
- **Upload**: Local paths for tools are not accepted directly — use `yollomi upload` to get a URL, or pass an existing HTTPS image URL.
