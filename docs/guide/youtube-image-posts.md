# Publish a YouTube image post

`cloudl youtube publish-post <metadata.json>` prepares a public channel post with one image and a caption. It uses the visible YouTube Posts editor, preserves caption text, and does not convert the image to video.

```json
{
  "channel": "UCxxxxxxxxxxxxxxxxxxxxxx",
  "account": "Your channel display name",
  "content": "Your caption, in your chosen language.",
  "image": "image.jpg"
}
```

Image paths resolve relative to the metadata file. This command supports one JPG, PNG, GIF or WebP up to 16 MiB. YouTube itself supports multi-image posts; this command currently handles one image. The editor must use English labels and Public visibility. It checks the owner channel, displayed account, exact caption, image SHA-256, preview readiness and enabled Post button.

```bash
cloudl youtube publish-post post.json --session youtube-post
# Inspect the prepared editor, including the full image and feed preview.
cloudl youtube publish-post post.json --session youtube-post --resume --execute
```

The default only prepares the form. `--execute` submits once, then checks the new post and its independent permalink. A `post.json.state.json` receipt binds metadata, image bytes and browser session. Published receipts return the original result without posting again. An uncertain submission remains `submitting` and cannot be retried automatically; inspect your channel before manual reconciliation. Use a new metadata file for a different post and retain old receipts. Do not remove active publisher locks.

Verified against the visible editor on 2026-10-22. [YouTube's official post documentation](https://support.google.com/youtube/answer/7124474) describes supported image formats and display behavior. A portrait image can appear as a square feed preview; inspect the full image before posting.

YouTube login checks read the initialized page's signed-in state. Missing cookies from a browser cookie probe alone do not establish that the account is signed out; a page that does not initialize produces a timeout.
