# TikTok video publishing

`cloudl tiktok publish-video metadata.json` uploads one local video to TikTok Studio
using the current Chrome login. It prepares the form by default. Add `--execute`
to post immediately; no scheduling or bulk posting is supported.

```json
{
  "video": "/absolute/path/video.mp4",
  "account": "your_handle",
  "caption": "Your description\n#learning #ideas",
  "visibility": "public",
  "ai_generated": false
}
```

- `account`: exact TikTok handle without `@`; optional `account_id` is a numeric
  string used as an additional identity check.
- `caption`: 1–4000 characters, including hashtags. Text is copied as supplied;
  the command never appends AI production or narration wording.
- `visibility`: required `public`, `friends`, or `private`.
- `ai_generated`: required boolean controlling the separate platform AI label.
  Set it to match your video. It does not change the caption.
- `video`: nonempty MP4/MOV/M4V/WebM, up to 30 GB. Studio enforces duration and
  account-specific restrictions (the observed UI allows up to 60 minutes).

```bash
# Upload and inspect the prepared form, without clicking Post
cloudl tiktok publish-video metadata.json --session tiktok-upload -f json

# Continue exactly that upload and publish once
cloudl tiktok publish-video metadata.json --session tiktok-upload --resume --execute -f json

# Upload and publish in one command
cloudl tiktok publish-video metadata.json --execute --timeout 900 -f json
```

Keep the session open between preparation and resume. `--resume` requires the
same metadata, file contents and session, plus the exact upload file key recorded
by the initial command. A manually uploaded file cannot be adopted by resume.
File bytes are hashed; the filename and size are also checked against Studio.

The existing video cover and comment/reuse settings remain as shown in Studio.
Branded-content mode, verification challenges, unexpected dialogs and changed
controls stop the command for inspection. Only the observed editing tutorial,
automatic-check opt-in dialog and requested AI-label confirmation are handled.
Automatic content checks are not enabled on the account by this command.

## Results and duplicate prevention

Output columns are `status`, `account`, `caption`, `videoId`, `url`.
`prepared` has a null `videoId` and points to the upload page. `submitted`
requires a new creator-list item matching the caption, account (when exposed)
and submission time; it includes the canonical video link. Submission does not
mean moderation has completed or that a private post is public.

The command writes `metadata.json.state.json` and holds an exclusive sibling
`.lock` during each run. It records `submitting` **before** clicking Post and
clicks only once. If the click, receipt lookup or confirmation times out, the
state remains uncertain and later invocations refuse to submit again, even after
metadata edits. Check `cloudl tiktok creator-videos` and TikTok Studio before
reconciling that record. Do not delete the record just to retry. A confirmed
receipt is returned on repeated invocations without another upload or post.
A crash can leave the lock behind; verify that no invocation remains active
before removing it. Reuse the same metadata file to retain duplicate protection.

Receipt lookup compares the newest 20 creator items with a pre-submit baseline
for up to 60 seconds. Delayed indexing, an account/session change, more than 20
intervening posts, or an extra confirmation dialog can leave an uncertain result
even if TikTok accepted the post. Inspect Studio in that case.

## Strategy and verification

Strategy: **UI_SELECTOR**, contract: **visible-ui**. Chrome supplies authentication.
No signed publishing endpoint is replayed. Upload uses `input[accept="video/*"]`;
description uses the Draft editor's selection and paste events; visibility uses the option's observed
`data-value`; the AI label and Post button use TikTok's `data-e2e` attributes.
The account comes from `__Creator_Center_Context__.commonAppContext.user`.
Read-only `webCreationStore` state binds the uploaded file and confirms
`UPLOAD_COMPLETE`. Changes in these structures fail closed.

Generic `browser fill` can update the visible editor while leaving repeated
hashtag entities in Draft's underlying model. This command waits for the full
selection to reach Draft before pasting and verifies both DOM and model text.
Resume skips caption input entirely when both already match.
DOM text is read from Draft blocks to preserve blank paragraphs without the
extra newlines added by `innerText`. Selection requires the active DOM editor
and the full model range; Draft's model focus flag can remain stale.

Receipt verification reuses the existing `creator-videos` page-fetch contract,
`/tiktok/creator/manage/item_list/v1/`. This internal read API is needed to
distinguish a newly submitted video from an upload-complete message or an older
post. Credentials remain in the page; no cookies or tokens are persisted.

Verified 2026-09-20: live Studio upload, exact multiline caption, private
visibility, AI-label confirmation, and the read-only empty creator-list response.
Studio omits `item_list` for an empty account with `status_code: 0`, `cursor: 0`,
and `has_more: false`. Preparation and resume are tested separately.
Production-path tests cover successful receipts, wrong accounts/files, lookup
failures, locks, changed metadata, and uncertain submissions. A user-authorized
live publication also completed on 2026-09-20: the 5m42s video returned a matching
creator-list receipt, then Studio changed from `Content under review` / `Only me`
to `Everyone`. The transient review state must not be treated as final privacy.
