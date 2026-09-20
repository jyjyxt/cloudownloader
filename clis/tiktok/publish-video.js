// Strategy: UI_SELECTOR; contract: visible-ui (TikTok Studio, 2026-09-20).
// Upload/caption/privacy/AI label use the visible editor. Bootstrap identity and
// read-only upload state bind the selected file; no runtime controller mutations.
// Receipt verification reuses creator-videos' existing read-only Studio contract.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createReadStream, existsSync, readFileSync, writeFileSync, renameSync, openSync, closeSync, unlinkSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { cli, Strategy } from '@jyjyxt/cloudl/registry';
import { ArgumentError, AuthRequiredError, CommandExecutionError, TimeoutError } from '@jyjyxt/cloudl/errors';
import { buildFetchItemListScript, buildItemListRequest, extractUsername } from './creator-videos.js';

const exec = promisify(execFile);
const UPLOAD_URL = 'https://www.tiktok.com/tiktokstudio/upload';
const FILE = 'input[type="file"][accept="video/*"]';
const CAPTION = '.public-DraftEditor-content[contenteditable="true"]';
const POST = '[data-e2e="post_video_button"]';
const AI = '[data-e2e="aigc_container"] input[role="switch"]';
const privacy = { public: 'Everyone', friends: 'Friends', private: 'Only you' };
const privacyValues = { public: '0', friends: '2', private: '1' };
const normalize = text => String(text ?? '').replace(/\r/g, '').trim();
const compact = text => normalize(text).replace(/\s+/g, ' ');

export function validateMetadata(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new ArgumentError('Metadata must be an object');
  for (const field of ['video', 'account', 'caption', 'visibility']) {
    if (typeof data[field] !== 'string' || !data[field].trim()) throw new ArgumentError(`Require ${field}`);
  }
  if (!/^[\w.]{1,24}$/.test(data.account)) throw new ArgumentError('account must be the TikTok handle, without @');
  if (Array.from(data.caption).length > 4000) throw new ArgumentError('caption must be 1–4000 characters');
  if (!Object.hasOwn(privacy, data.visibility)) throw new ArgumentError('visibility must be public, friends or private');
  if (typeof data.ai_generated !== 'boolean') throw new ArgumentError('Require explicit boolean ai_generated for the separate platform label');
  if (data.account_id !== undefined && (typeof data.account_id !== 'string' || !/^\d+$/.test(data.account_id))) throw new ArgumentError('account_id must be a numeric string');
  return data;
}

// This function also runs verbatim inside JSDOM tests; keep browser globals here.
export function inspectPage() {
  const user = window.__Creator_Center_Context__?.commonAppContext?.user;
  const state = window.webCreationStore?.getState?.();
  const uploader = state?.uploader;
  const editors = state?.form?.videoFormDataMap?.[uploader?.currentFileKey]?.mentionEditorStates;
  const content = editors?.length === 1 ? editors[0].getCurrentContent?.() : null;
  const selection = editors?.length === 1 ? editors[0].getSelection?.().toJS() : null;
  const first = content?.getFirstBlock?.(), last = content?.getLastBlock?.();
  const selectedForward = selection && selection.anchorKey === first?.getKey() && selection.anchorOffset === 0 && selection.focusKey === last?.getKey() && selection.focusOffset === last?.getLength();
  const selectedBackward = selection && selection.focusKey === first?.getKey() && selection.focusOffset === 0 && selection.anchorKey === last?.getKey() && selection.anchorOffset === last?.getLength();
  const visible = e => !!e && !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
  const button = document.querySelector('[data-e2e="post_video_button"]');
  const editor = document.querySelector('.public-DraftEditor-content[contenteditable="true"]');
  const blocks = editor ? [...editor.querySelectorAll('[data-block="true"]')] : [];
  const ai = document.querySelector('[data-e2e="aigc_container"] input[role="switch"]');
  const files = Object.values(uploader?.fileInfoMap || {}).map(f => ({
    key: f.fileKey, name: f.rawFile?.name, size: f.rawFile?.size,
    uploadPhase: uploader.uploadStatusMap?.[f.fileKey],
  }));
  return {
    location: location.href,
    identity: user?.uniqueId ? { handle: user.uniqueId, uid: String(user.uid || '') } : null,
    files, editorText: blocks.length ? blocks.map(block => block.textContent).join('\n') : editor?.innerText ?? null,
    modelText: content?.getPlainText?.() ?? null,
    captionFullySelected: !!(document.activeElement === editor && (selectedForward || selectedBackward)),
    privacyText: document.querySelector('button[role="combobox"] .Select__triggerInner')?.textContent.trim(),
    aiChecked: ai?.checked ?? null,
    nowChecked: document.querySelector('input[name="postSchedule"][value="post_now"]')?.checked ?? false,
    branded: document.querySelector('[data-e2e="disclose_content_container"] input')?.checked ?? false,
    canPost: !!button && !button.disabled && button.getAttribute('aria-disabled') !== 'true',
    pageText: document.body?.innerText || '',
    challenge: [...document.querySelectorAll('[id*="captcha"], [class*="captcha_verify"], .secsdk-captcha-wrapper')].some(visible),
    dialogs: [...document.querySelectorAll('[role="dialog"]')].filter(visible).map(e => e.innerText),
  };
}

function assertIdentity(snapshot, data) {
  if (!snapshot.identity) throw new AuthRequiredError('www.tiktok.com', 'TikTok Studio login/identity unavailable');
  if (snapshot.identity.handle !== data.account || (data.account_id && snapshot.identity.uid !== data.account_id))
    throw new CommandExecutionError('Logged-in TikTok account does not match metadata');
}
function assertPage(snapshot) {
  if (snapshot.challenge) throw new CommandExecutionError('TikTok verification challenge; complete it in the browser before continuing');
  if (/\/login(?:[/?]|$)/.test(snapshot.location)) throw new AuthRequiredError('www.tiktok.com');
  if (/upload failed|couldn.t upload|上传失败/i.test(snapshot.pageText)) throw new CommandExecutionError('TikTok video upload failed');
}
function assertFile(snapshot, file, key) {
  if (snapshot.files.length !== 1 || snapshot.files[0].name !== file.name || snapshot.files[0].size !== file.size || !snapshot.files[0].key || (key && snapshot.files[0].key !== key))
    throw new CommandExecutionError('Uploaded file changed or does not match the recorded upload');
}
export function assertReady(snapshot, data, file, key) {
  assertPage(snapshot); assertIdentity(snapshot, data); assertFile(snapshot, file, key);
  if (snapshot.files[0].uploadPhase !== 'UPLOAD_COMPLETE' || !snapshot.canPost || !snapshot.nowChecked || snapshot.branded || snapshot.dialogs.length ||
      normalize(snapshot.editorText) !== normalize(data.caption) || normalize(snapshot.modelText) !== normalize(data.caption) || snapshot.privacyText !== privacy[data.visibility] || snapshot.aiChecked !== data.ai_generated)
    throw new CommandExecutionError('Final TikTok form differs from metadata, has a blocking dialog, or is not ready');
}

export function parseCreatorItems(response) {
  if (response?.status === 401 || response?.status === 403) throw new AuthRequiredError('www.tiktok.com');
  if (!response?.ok || response.networkError || response.parseError) throw new CommandExecutionError('Cannot verify TikTok Studio posts; receipt lookup failed');
  const data = response.data?.data ?? response.data;
  if (!data || (data.status_code !== undefined && Number(data.status_code) !== 0) ||
      (data.statusCode !== undefined && Number(data.statusCode) !== 0) ||
      ((data.status_msg ?? data.statusMsg) && !/^(success|ok)$/i.test(data.status_msg ?? data.statusMsg)))
    throw new CommandExecutionError('TikTok Studio returned an invalid posts response');
  // Studio omits item_list for a fresh account; verified with the content UI.
  if (data.item_list === undefined && data.status_code === 0 && data.has_more === false && data.cursor === 0) return [];
  if (!Array.isArray(data.item_list)) throw new CommandExecutionError('TikTok Studio returned an invalid posts list');
  if (data.item_list.some(i => !/^\d+$/.test(String(i.item_id ?? i.id ?? '')))) throw new CommandExecutionError('TikTok Studio post is missing a stable video ID');
  return data.item_list;
}
export function findReceipt(items, previousIds, data, submittedAt) {
  const matches = items.filter(item => {
    const id = String(item.item_id ?? item.id);
    const author = extractUsername(item);
    const time = Number(item.post_time ?? item.create_time);
    return !previousIds.includes(id) && compact(item.desc ?? item.title) === compact(data.caption) &&
      (!author || author === data.account) && Number.isFinite(time) && time >= submittedAt / 1000 - 5;
  });
  if (matches.length > 1) throw new CommandExecutionError('Multiple matching TikTok posts; inspect Studio before reconciling the receipt');
  if (!matches.length) return null;
  const videoId = String(matches[0].item_id ?? matches[0].id);
  return { status: 'submitted', account: data.account, caption: data.caption, videoId, url: `https://www.tiktok.com/@${data.account}/video/${videoId}` };
}

async function browserCall(session, ...parts) {
  try {
    const { stdout } = await exec('cloudl', ['browser', session, ...parts], { timeout: 65000, maxBuffer: 3000000 });
    return JSON.parse(stdout);
  } catch (error) {
    throw new CommandExecutionError(`Cloudl browser ${parts[0]} failed`, error.stderr || error.message);
  }
}

// Injectable transport exercises the actual navigation/preflight/submit path in tests.
export async function runPublish(args, deps = {}) {
  let data;
  const metadata = resolve(args.metadata);
  try { data = validateMetadata(JSON.parse(readFileSync(metadata, 'utf8'))); }
  catch (error) { if (error instanceof ArgumentError) throw error; throw new ArgumentError(`Cannot read metadata: ${error.message}`); }
  const seconds = Number(args.timeout ?? 900);
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 3600) throw new ArgumentError('timeout must be 1–3600 seconds');
  const session = args.session ?? 'tiktok-publish';
  if (!/^[\w-]+$/.test(session)) throw new ArgumentError('session must contain letters, numbers, underscores or hyphens');
  const video = resolve(data.video);
  let info;
  try { info = statSync(video); } catch { throw new ArgumentError(`Video not found: ${video}`); }
  if (!info.isFile() || info.size < 1 || info.size > 30_000_000_000 || !/\.(mp4|mov|m4v|webm)$/i.test(video)) throw new ArgumentError('Require a nonempty MP4/MOV/M4V/WebM video no larger than 30 GB');
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(video)) hash.update(chunk);
  const fingerprint = createHash('sha256').update(JSON.stringify({ data, video, sha256: hash.digest('hex') })).digest('hex');
  const file = { name: basename(video), size: info.size };
  const statePath = metadata + '.state.json';
  const lockPath = statePath + '.lock';
  let lock;
  try { lock = openSync(lockPath, 'wx', 0o600); }
  catch (error) { throw new CommandExecutionError('Cannot acquire publication lock', error.code === 'EEXIST' ? 'Another invocation may be active. Inspect it before removing the lock.' : error.message); }
  const browser = deps.browser ?? ((...parts) => browserCall(session, ...parts));
  const sleep = deps.sleep ?? (ms => new Promise(r => setTimeout(r, ms)));
  const now = deps.now ?? Date.now;
  const evaluate = js => browser('eval', js);
  const snapshot = () => evaluate(`(${inspectPage.toString()})()`);
  const persist = value => {
    const tmp = statePath + '.tmp';
    writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
    renameSync(tmp, statePath);
  };
  const wait = async (check, label, timeout = seconds * 1000) => {
    const end = now() + timeout;
    do { const result = await check(); if (result) return result; await sleep(1500); } while (now() < end);
    throw new TimeoutError(label, timeout / 1000);
  };
  try {
    let state;
    if (existsSync(statePath)) {
      try { state = JSON.parse(readFileSync(statePath, 'utf8')); }
      catch { throw new CommandExecutionError('Publication state is unreadable; inspect it before continuing'); }
      if (state.status === 'submitting') throw new CommandExecutionError('Previous submission is unconfirmed; inspect TikTok Studio before retrying');
      if (state.status === 'submitted') {
        if (state.fingerprint !== fingerprint) throw new CommandExecutionError('Metadata belongs to an already submitted video');
        return [state.result];
      }
      if (state.status !== 'prepared') throw new CommandExecutionError('Unknown publication state; inspect it before continuing');
    }
    if (args.resume) {
      if (!state || state.fingerprint !== fingerprint || state.session !== session || !state.fileKey)
        throw new CommandExecutionError('Resume requires matching prepared metadata, file and browser session');
    } else await browser('open', UPLOAD_URL);
    let s = await wait(async () => {
      const current = await snapshot(); assertPage(current);
      return current.identity ? current : false;
    }, 'TikTok Studio identity');
    assertIdentity(s, data);
    if (!s.location.startsWith(UPLOAD_URL)) throw new CommandExecutionError('Expected TikTok Studio upload page');
    if (args.resume) assertFile(s, file, state.fileKey);
    else {
      if (s.editorText !== null || s.files.length) throw new CommandExecutionError('An upload is already open; use --resume with its original metadata');
      await browser('upload', FILE, video);
    }
    s = await wait(async () => { const current = await snapshot(); assertPage(current); return current.editorText !== null && current.files.length ? current : false; }, 'TikTok video editor');
    assertIdentity(s, data); assertFile(s, file, args.resume ? state.fileKey : null);
    state = { status: 'prepared', fingerprint, session, fileKey: s.files[0].key };
    persist(state);
    // Dismiss only the observed, unrelated first-run tutorial and opt-in prompt.
    await evaluate(`(() => {
      const buttons = [...document.querySelectorAll('button')];
      if (/New editing features added|Preview your video on your phone/.test(document.body.innerText)) buttons.find(e => e.innerText.trim() === 'Got it')?.click();
      if (document.body.innerText.includes('Turn on automatic content checks?')) buttons.find(e => e.innerText.trim() === 'Cancel')?.click();
      return true;
    })()`);
    s = await snapshot();
    if (normalize(s.editorText) !== normalize(data.caption) || normalize(s.modelText) !== normalize(data.caption)) {
      // Generic fill can leave Draft's model holding old hashtag entities even
      // when the DOM looks correct. Select through UI events, wait for Draft to
      // acknowledge the selection, then paste through its normal input handler.
      await evaluate(`(() => {
        const e=document.querySelector(${JSON.stringify(CAPTION)});
        e.blur(); e.focus(); document.execCommand('selectAll', false);
        e.dispatchEvent(new MouseEvent('mouseup', {bubbles:true}));
        document.dispatchEvent(new Event('selectionchange', {bubbles:true}));
        return true;
      })()`);
      await wait(async () => {
        const current = await snapshot();
        if (current.captionFullySelected) return true;
        if (/New editing features added|Preview your video on your phone/.test(current.pageText)) {
          await browser('click', '--role', 'button', '--name', 'Got it');
          await evaluate(`(() => {
            const e=document.querySelector(${JSON.stringify(CAPTION)});
            e.blur(); e.focus(); document.execCommand('selectAll', false);
            e.dispatchEvent(new MouseEvent('mouseup', {bubbles:true}));
            document.dispatchEvent(new Event('selectionchange', {bubbles:true}));
            return true;
          })()`);
        }
        return false;
      }, 'TikTok caption selection', 15000);
      await evaluate(`(() => {
        const e=document.querySelector(${JSON.stringify(CAPTION)}), clipboard=new DataTransfer();
        clipboard.setData('text/plain', ${JSON.stringify(data.caption)});
        e.dispatchEvent(new ClipboardEvent('paste', {clipboardData:clipboard,bubbles:true,cancelable:true}));
        return true;
      })()`);
      await wait(async () => {
        const current=await snapshot();
        return normalize(current.editorText) === normalize(data.caption) && normalize(current.modelText) === normalize(data.caption);
      }, 'TikTok caption DOM/model verification', 15000);
    }
    await browser('click', 'input[name="postSchedule"][value="post_now"]');
    s = await snapshot();
    if (s.privacyText !== privacy[data.visibility]) {
      await browser('click', 'button[role="combobox"]');
      await browser('click', `[role="option"][data-value='"${privacyValues[data.visibility]}"']`);
    }
    await evaluate(`(() => {const e=[...document.querySelectorAll('span')].find(e=>e.textContent==='Show more');e?.click();return true;})()`);
    s = await snapshot();
    if (s.aiChecked === null) throw new CommandExecutionError('TikTok AI label control unavailable');
    if (s.aiChecked !== data.ai_generated) {
      await browser('click', AI);
      if (data.ai_generated) {
        await wait(async () => {
          const current = await snapshot();
          if (current.aiChecked) return true;
          if (current.pageText.includes('Labeling AI-generated content')) {
            await browser('click', '--role', 'button', '--name', 'Turn on');
            return false;
          }
          return false;
        }, 'TikTok AI label', 15000);
      }
    }
    await wait(async () => {
      const current = await snapshot(); assertPage(current); assertIdentity(current, data); assertFile(current, file, state.fileKey);
      if (current.files[0].uploadPhase === 'UPLOAD_FAILED') throw new CommandExecutionError('TikTok upload failed');
      return current.files[0].uploadPhase === 'UPLOAD_COMPLETE' && current.canPost;
    }, 'TikTok video upload');
    assertReady(await snapshot(), data, file, state.fileKey);
    if (!args.execute) return [{ status: 'prepared', account: data.account, caption: data.caption, videoId: null, url: UPLOAD_URL }];

    const listPosts = async () => parseCreatorItems(await evaluate(buildFetchItemListScript(buildItemListRequest(0, 20))));
    const previousIds = (await listPosts()).map(i => String(i.item_id ?? i.id));
    // Recheck every field and identity after the read request, immediately before posting.
    assertReady(await snapshot(), data, file, state.fileKey);
    const submittedAt = now();
    state = { ...state, status: 'submitting', submitted_at: new Date(submittedAt).toISOString(), previousIds };
    persist(state);
    await browser('click', POST); // Exactly once, even if transport/confirmation fails.
    const result = await wait(async () => {
      const current = await snapshot(); assertPage(current); assertIdentity(current, data);
      return findReceipt(await listPosts(), previousIds, data, submittedAt);
    }, 'TikTok receipt (submission may have succeeded; check Studio before retrying)', 60000);
    persist({ ...state, status: 'submitted', result });
    return [result];
  } finally { closeSync(lock); unlinkSync(lockPath); }
}

cli({
  site: 'tiktok', name: 'publish-video', access: 'write', strategy: Strategy.COOKIE, browser: false,
  description: 'Upload a video to TikTok Studio; prepare by default, --execute posts once, --resume continues a prepared upload',
  args: [
    { name: 'metadata', positional: true, required: true, help: 'JSON file: video, account, caption, visibility, ai_generated; optional account_id' },
    { name: 'session', default: 'tiktok-publish', help: 'Named Cloudl browser session' },
    { name: 'resume', type: 'bool', default: false, help: 'Resume the same prepared file, metadata and browser session' },
    { name: 'execute', type: 'bool', default: false, help: 'Post once after verifying the form; uncertain submissions are never retried' },
    { name: 'timeout', type: 'int', default: 900, help: 'Page/upload wait timeout in seconds (1–3600)' },
  ],
  columns: ['status', 'account', 'caption', 'videoId', 'url'],
  func: args => runPublish(args),
});
