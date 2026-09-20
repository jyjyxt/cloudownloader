// Creator-center UI contract observed 2026-09-19. All browser work goes through cloudl.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { createReadStream, readFileSync, writeFileSync, statSync, existsSync, openSync, closeSync, unlinkSync, renameSync } from 'node:fs';
import { resolve, basename, join } from 'node:path';
import { tmpdir } from 'node:os';
import { cli, Strategy } from '@jyjyxt/cloudl/registry';
import { ArgumentError, CommandExecutionError, TimeoutError } from '@jyjyxt/cloudl/errors';

const run = promisify(execFile);
const BASE = 'https://channels.weixin.qq.com/platform/post/';
const clean = text => String(text ?? '').replace(/\r/g, '').trim();
const compact = text => clean(text).replace(/\s+/g, ' ');
const hash = value => createHash('sha256').update(value).digest('hex');
const enabled = value => value === true || value === 'true' || value === '1';

export function validateMetadata(data) {
  for (const key of ['video', 'account', 'title', 'caption']) {
    if (typeof data?.[key] !== 'string' || !data[key].trim()) throw new ArgumentError(`Require ${key}`);
  }
  if (data.account !== data.account.trim() || data.title !== data.title.trim()) throw new ArgumentError('Trim account/title whitespace');
  if (Array.from(data.title).length > 16 || /[\r\n]/.test(data.title)) throw new ArgumentError('Short title must be one line, at most 16 characters');
  if (Array.from(data.caption).length > 1000) throw new ArgumentError('Caption max 1000 characters');
  if (data.declaration !== undefined && data.declaration !== '无需标注') throw new ArgumentError('This command currently supports only 无需标注; other declarations require the creator UI');
  if (data.original !== undefined && typeof data.original !== 'boolean') throw new ArgumentError('original must be boolean');
  return data;
}

export function previousResult(state, fingerprint, verify) {
  if (!state) return null;
  if (state.fingerprint !== fingerprint) throw new CommandExecutionError('Metadata/video changed; keep the existing receipt with its original metadata');
  if (state.status === 'published') return state.result;
  if (state.status === 'submitting' && !verify) throw new CommandExecutionError('Previous submission unconfirmed. Inspect video manager and use --verify <object-id>; do not resubmit');
  if (!['prepared', 'submitting'].includes(state.status)) throw new CommandExecutionError('Invalid receipt status');
  return null;
}

export async function submitOnce({ state, persist, click, verify }) {
  if (state.status !== 'prepared') throw new CommandExecutionError('Submission is not prepared');
  const pending = { ...state, status: 'submitting', submitted_at: new Date().toISOString() };
  persist(pending); // A lost acknowledgement must never trigger a second click.
  await click();
  const result = await verify(pending);
  persist({ ...pending, status: 'published', result });
  return result;
}

export function assertPrepared(actual, data, file) {
  if (actual.account !== data.account || actual.title !== data.title || actual.shortTitle !== data.title ||
      clean(actual.caption) !== clean(data.caption) || clean(actual.savedCaption) !== clean(data.caption))
    throw new CommandExecutionError('Visible or saved metadata/account does not match; refusing to publish');
  if (actual.files?.length !== 1 || actual.files[0].name !== basename(file.path) || actual.files[0].size !== file.size)
    throw new CommandExecutionError('Uploaded file does not match metadata');
  if (data.original && (!actual.originalAvailable || actual.original !== true))
    throw new CommandExecutionError('Requested original declaration is unavailable or not checked; refusing to publish');
  if (!actual.canPost || actual.uploading || !actual.preview || actual.hasLocation || actual.scheduled || !actual.unlabelled)
    throw new CommandExecutionError('Upload/form is not ready, or location/schedule/declaration differs');
}

export function assertPublished(actual, data, objectId) {
  if (actual.account !== data.account || actual.objectId !== objectId ||
      clean(actual.publishedCaption) !== clean(data.caption) || clean(actual.publishedTitle) !== data.title)
    throw new CommandExecutionError('Published record does not match title/caption/account. Submission will not be retried or deleted automatically');
  if (data.original && actual.original !== true) throw new CommandExecutionError('Published original declaration not confirmed; do not resubmit');
  return { status: 'published', original: actual.original === true, account: data.account, title: data.title, object_id: objectId,
    url: BASE + 'list', verification_url: actual.url, metadata_verified: true };
}

// Self-contained so the same implementation is sent to the named browser and tested with DOM fixtures.
export async function pageAction(action, data = {}) {
  const root = document.querySelector('wujie-app')?.shadowRoot;
  const body = root?.querySelector('body');
  const editor = root?.querySelector('[contenteditable][data-placeholder="添加描述"]');
  const title = root?.querySelector('input[placeholder*="短标题"]');
  const vm = editor?.parentElement.__vue__;
  const visible = e => !!e?.getBoundingClientRect().width;
  const text = body?.innerText || '';
  const account = document.querySelector('.account-info .name')?.innerText?.trim();
  const originalOwner = () => Array.from(root?.querySelectorAll('*') || []).map(e => e.__vue__)
    .find(v => v?.$data && Object.prototype.hasOwnProperty.call(v.$data, 'checkOriginalFlag'));
  const originalState = () => {
    const owner = originalOwner();
    return { originalAvailable: owner?.canShowOriginalMark === true && !owner.disDeclareOriginal,
      original: owner?.checkOriginalFlag === true,
      originalReason: owner?.disDeclareOriginal || (owner?.canShowOriginalMark === false ? '当前账号未开放原创声明入口' : '') };
  };
  const shortTitleModel = () => {
    for (let e = title; e && e !== root; e = e.parentElement) {
      if (typeof e.__vue__?.$data?.shortTitle === 'string') return e.__vue__.$data.shortTitle;
    }
    return undefined;
  };
  if (action === 'snapshot') {
    const location = vm?.postStore?.postObjDesc?.location;
    return { url: locationHref(), account, text, editor: !!editor, ...originalState(),
      title: title?.value, shortTitle: shortTitleModel(), caption: editor?.innerText,
      savedCaption: vm?.postStore?.postObjDesc?.description,
      canPost: vm?.postStore?.canPost === true,
      files: Array.from(root?.querySelectorAll('input[type="file"][accept*="video"]') || []).flatMap(e => Array.from(e.files || []).map(f => ({ name: f.name, size: f.size }))),
      uploading: /取消上传|上传中|转码中/.test(text),
      preview: Array.from(root?.querySelectorAll('video') || []).some(e => e.readyState >= 2 && e.duration > 0 && e.videoWidth > 0),
      hasLocation: !!location && Object.keys(location).length > 0,
      scheduled: Array.from(root?.querySelectorAll('input[type="radio"]') || []).some(e => e.checked && e.parentElement.innerText.trim() === '定时'),
      unlabelled: /视频标注\n(?:选择视频标注|无需标注)(?:\n|$)/.test(text),
      posts: Array.from(root?.querySelectorAll('.post-feed-item') || []).map(e => ({ id: e.__vue__?.post?.objectId, text: e.innerText, original: e.__vue__?.post?.originalInfo?.isDeclared === true || e.__vue__?.post?.originalInfo?.isDeclared === 1 })) };
  }
  function locationHref() { return window.location.href; }
  if (action === 'expose-upload') {
    const input = root?.querySelector('input[type="file"][accept*="video"]');
    if (!input || window.__cloudlWechatUpload) throw new Error('Missing upload input or unfinished prior upload');
    window.__cloudlWechatUpload = { input, parent: input.parentNode, next: input.nextSibling, id: input.getAttribute('id') };
    input.id = 'cloudl_wechat_video_input';
    document.body.appendChild(input); // CDP querySelector cannot cross the wujie shadow root.
    return true;
  }
  if (action === 'restore-upload') {
    const saved = window.__cloudlWechatUpload;
    if (saved) {
      saved.parent.insertBefore(saved.input, saved.next?.parentNode === saved.parent ? saved.next : null);
      if (saved.id === null) saved.input.removeAttribute('id'); else saved.input.id = saved.id;
      delete window.__cloudlWechatUpload;
    }
    return true;
  }
  if (action === 'fill') {
    if (!title || !editor || typeof vm?.updateDescData !== 'function') throw new Error('Editor synchronization contract changed');
    title.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(title, data.title);
    title.dispatchEvent(new Event('input', { bubbles: true }));
    title.dispatchEvent(new Event('change', { bubbles: true }));
    title.blur();
    editor.focus();
    editor.innerText = data.caption;
    editor.dispatchEvent(new InputEvent('input', { bubbles: true, data: data.caption, inputType: 'insertText' }));
    editor.blur();
    // The native editor serializes through this handler, not the DOM input event alone.
    vm.updateDescData();
    return true;
  }
  if (action === 'location-open') { root?.querySelector('.position-display-wrap')?.click(); return true; }
  if (action === 'location-clear') {
    const item = Array.from(root?.querySelectorAll('*') || []).find(e => !e.children.length && visible(e) && e.textContent.trim() === '不显示位置');
    if (!item) throw new Error('No 不显示位置 option');
    item.click(); return true;
  }
  if (action === 'reload') {
    const items = Array.from(document.querySelectorAll('*')).filter(e => !e.children.length && visible(e) && e.textContent.trim() === '重新加载');
    if (items.length !== 1) return false;
    items[0].click(); return true;
  }
  if (action === 'original') {
    const state = originalState();
    if (!state.originalAvailable) throw new Error(state.originalReason || 'Original declaration control unavailable');
    if (state.original) return true;
    const box = root.querySelector('.declare-original-checkbox input[type="checkbox"]');
    if (!box || box.disabled) throw new Error('Original declaration checkbox unavailable');
    box.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    const dialog = Array.from(root.querySelectorAll('.declare-original-dialog')).find(visible);
    if (!dialog) throw new Error('Original declaration confirmation dialog missing');
    const agreement = dialog.querySelector('.original-proto-wrapper input[type="checkbox"]');
    if (!agreement || agreement.disabled) throw new Error('Original declaration agreement unavailable');
    if (!agreement.checked) agreement.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    const buttons = Array.from(dialog.querySelectorAll('button')).filter(e => visible(e) && !e.disabled && e.innerText.trim() === '声明原创');
    if (buttons.length !== 1) throw new Error('Original declaration confirmation button ambiguous');
    buttons[0].click();
    await new Promise(resolve => setTimeout(resolve, 0));
    if (!originalState().original) throw new Error('Original declaration not saved in editor');
    return true;
  }
  if (action === 'submit') {
    if (data.original && (!originalState().originalAvailable || !originalState().original))
      throw new Error('Original declaration changed before submission');
    if (account !== data.account || !vm?.postStore?.canPost || vm.postStore.postObjDesc.description !== editor.innerText ||
        editor.innerText.trim() !== data.caption.trim() || title?.value !== data.title || shortTitleModel() !== data.title)
      throw new Error('Saved metadata changed before submission');
    const buttons = Array.from(root.querySelectorAll('button')).filter(e => visible(e) && !e.disabled && e.innerText.trim() === '发表');
    if (buttons.length !== 1) throw new Error('Publish button missing or ambiguous');
    buttons[0].click(); return true;
  }
  if (action === 'published') {
    // The edit page is read only unless its 完成 button is clicked.
    const start = text.indexOf('视频描述\n');
    const end = text.lastIndexOf('\n短标题\n');
    const suffix = end >= 0 ? text.slice(end + '\n短标题\n'.length) : '';
    return { url: locationHref(), account, objectId: new URL(locationHref()).searchParams.get('objectId'),
      ready: start >= 0 && end > start && suffix.includes('\n取消\n'),
      publishedCaption: start >= 0 && end > start ? text.slice(start + '视频描述\n'.length, end) : undefined,
      publishedTitle: suffix.split('\n取消\n')[0] };
  }
  throw new Error('Unknown browser operation');
}

function writeReceipt(path, state) {
  const temp = path + '.tmp';
  writeFileSync(temp, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
  renameSync(temp, path);
}

export async function publishVideo(args, transport) {
  const metadata = resolve(args.metadata);
  let data;
  try { data = validateMetadata(JSON.parse(readFileSync(metadata, 'utf8'))); }
  catch (e) { if (e instanceof ArgumentError) throw e; throw new ArgumentError(`Cannot read metadata: ${e.message}`); }
  data = { ...data, original: enabled(args.original) || data.original === true };
  const video = resolve(data.video);
  let file;
  try { file = statSync(video); } catch { throw new ArgumentError('Video file not found'); }
  if (!file.isFile() || !file.size || !/\.(mp4|mov|m4v|webm)$/i.test(video)) throw new ArgumentError('Require a nonempty mp4/mov/m4v/webm file');
  const timeout = Number(args.timeout ?? 600);
  if (!Number.isInteger(timeout) || timeout < 30 || timeout > 3600) throw new ArgumentError('timeout must be 30–3600 seconds');
  if (args.verify && (enabled(args.execute) || enabled(args.resume))) throw new ArgumentError('--verify cannot be combined with --execute/--resume');
  if (args.verify && (typeof args.verify !== 'string' || !/^[A-Za-z0-9/_-]+$/.test(args.verify))) throw new ArgumentError('verify must be a raw object ID, not a URL');
  const session = args.session || 'wechat-video';
  const statePath = metadata + '.state.json';
  const videoHash = createHash('sha256');
  for await (const chunk of createReadStream(video)) videoHash.update(chunk);
  const fingerprint = hash(JSON.stringify({ account: data.account, title: data.title, caption: data.caption, declaration: data.declaration ?? '无需标注', video_hash: videoHash.digest('hex') }));
  const locks = [statePath + '.lock', join(tmpdir(), `cloudl-wechat-video-${hash(session)}.lock`)];
  const acquired = [];
  try {
    for (const lock of locks) {
      try { const fd = openSync(lock, 'wx', 0o600); closeSync(fd); acquired.push(lock); }
      catch (e) { throw new CommandExecutionError(`Cannot lock ${lock}: ${e.code}. Check for an active publisher before removing a stale lock`); }
    }
    let state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : null;
    if (state && state.status !== 'prepared' && Boolean(state.original) !== data.original)
      throw new CommandExecutionError('Original declaration differs from prior submission; inspect the existing receipt');
    const prior = previousResult(state, fingerprint, args.verify);
    if (prior && !args.verify) return [prior];
    const browser = transport || (async (...parts) => {
      try {
        const { stdout } = await run('cloudl', ['browser', session, ...parts], { timeout: 65000, maxBuffer: 3000000 });
        return JSON.parse(stdout);
      } catch (e) { throw new CommandExecutionError(`Cloudl browser failed: ${e.stderr || e.stdout || e.message}`); }
    });
    const act = (action, payload = {}) => browser('eval', `(${pageAction.toString()})(${JSON.stringify(action)},${JSON.stringify(payload)})`);
    const snapshot = () => act('snapshot');
    const deadline = Date.now() + timeout * 1000;
    const wait = async (check, label) => {
      while (Date.now() < deadline) {
        const result = await check();
        if (result) return result;
        await new Promise(r => setTimeout(r, 2000));
      }
      throw new TimeoutError(label, timeout);
    };
    const identity = s => {
      if (s.account !== data.account) throw new CommandExecutionError(`Wrong account: expected ${data.account}, got ${s.account || 'not logged in'}`);
    };
    const open = async (url, ready) => {
      await browser('open', url);
      let reloads = 0;
      return wait(async () => {
        const s = await snapshot();
        if (/login/.test(s.url)) throw new CommandExecutionError('Sign in to WeChat Channels in Chrome, then rerun');
        if (ready(s)) { identity(s); return s; }
        if (reloads < 2 && await act('reload')) reloads++;
        return false;
      }, 'Creator page loading');
    };
    const verifyRecord = async (id, original) => {
      await browser('open', BASE + 'coverEdit?objectId=' + encodeURIComponent(id));
      const record = await wait(async () => { const s = await act('published'); return s.ready && s.account ? s : false; }, 'Published metadata');
      const result = assertPublished({ ...record, original }, data, id);
      return { ...result, verified_at: new Date().toISOString() };
    };
    if (args.verify) {
      // Explicit recovery/adoption is read-only on the platform, even after a lost acknowledgement.
      const list = await open(BASE + 'list', s => s.posts.length > 0);
      if (!list.posts.some(p => p.id === args.verify)) throw new CommandExecutionError('Object ID is not on the current video-manager page');
      const result = await verifyRecord(args.verify, list.posts.find(p => p.id === args.verify)?.original);
      writeReceipt(statePath, { ...state, fingerprint, original: data.original, status: 'published', result });
      return [result];
    }
    if (!enabled(args.resume)) {
      // Establish a baseline so an older, identically worded video cannot count as success.
      const list = await open(BASE + 'list', s => /视频管理/.test(s.text) && /发表视频/.test(s.text));
      const matching = list.posts.filter(p => compact(p.text).includes(compact(data.caption)));
      if (matching.length) throw new CommandExecutionError(`Matching video already exists. Inspect and use --verify ${matching[0].id}`);
      state = { status: 'prepared', fingerprint, original: data.original, baseline: list.posts.map(p => p.id) };
      const form = await open(BASE + 'create', s => s.editor);
      if (data.original && !form.originalAvailable) throw new CommandExecutionError(form.originalReason || '当前账号未开放原创声明入口');
      if ((await snapshot()).files.length) throw new CommandExecutionError('Existing upload found; use --resume');
      writeReceipt(statePath, state);
      await act('expose-upload');
      try { await browser('upload', '#cloudl_wechat_video_input', video); }
      finally { await act('restore-upload'); }
    } else {
      if (!state || !Array.isArray(state.baseline)) throw new CommandExecutionError('Resume requires the prepared receipt from this command');
      const s = await snapshot(); identity(s);
      if (s.files.length !== 1 || s.files[0].name !== basename(video) || s.files[0].size !== file.size) throw new CommandExecutionError('Resume file mismatch');
    }
    state = { ...state, original: data.original };
    writeReceipt(statePath, state);
    if (data.original) await act('original');
    await act('fill', data);
    if ((await snapshot()).hasLocation) { await act('location-open'); await act('location-clear'); }
    console.error('Waiting for uploaded video and saved editor metadata...');
    const actual = await wait(async () => {
      const s = await snapshot(); identity(s);
      if (/上传失败|转码失败/.test(s.text)) throw new CommandExecutionError('Video upload failed');
      return s.canPost && s.preview && !s.uploading ? s : false;
    }, 'Video upload');
    assertPrepared(actual, data, { path: video, size: file.size });
    if (!enabled(args.execute)) return [{ status: 'prepared', account: data.account, title: data.title, url: actual.url }];
    const result = await submitOnce({ state, persist: s => writeReceipt(statePath, s), click: () => act('submit', data),
      verify: async () => {
        const list = await wait(async () => {
          const s = await snapshot(); if (s.account) identity(s); else return false;
          return /\/post\/list/.test(s.url) && s.posts.length ? s : false;
        }, 'Submission acknowledgement');
        const candidates = list.posts.filter(p => !state.baseline.includes(p.id) && compact(p.text).includes(compact(data.caption)));
        if (candidates.length !== 1) throw new CommandExecutionError('Cannot identify exactly one new matching post; inspect manager and use --verify');
        return verifyRecord(candidates[0].id, candidates[0].original);
      }
    });
    return [result];
  } finally {
    for (const path of acquired.reverse()) unlinkSync(path);
  }
}

cli({
  site: 'wechat-channels', name: 'publish-video', access: 'write', browser: false, strategy: Strategy.COOKIE,
  description: '视频号完整视频投稿：核对已保存文案，发布后复查，支持恢复与防重复提交',
  args: [
    { name: 'metadata', positional: true, required: true, help: 'JSON: video, account, title (<=16), caption (<=1000)' },
    { name: 'session', default: 'wechat-video', help: 'Cloudl 浏览器会话名称' },
    { name: 'original', type: 'bool', default: false, help: '声明原创并确认原创协议；需要账号已开放原创入口，否则停止且不发表' },
    { name: 'execute', type: 'bool', default: false, help: '上传核对后立即发表一次；默认仅准备' },
    { name: 'resume', type: 'bool', default: false, help: '继续同一会话中的已上传视频' },
    { name: 'verify', help: '只核对指定已发布 object ID，保存回执；不上传或发表' },
    { name: 'timeout', type: 'int', default: 600, help: '整体等待秒数，30–3600' },
  ],
  columns: ['status', 'account', 'title', 'object_id', 'url'],
  func: args => publishVideo(args),
});
