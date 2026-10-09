// Strategy: UI_SELECTOR; contract: visible-ui.
// Verified on 2026-09-19: creator video upload input, title placeholder,
// ProseMirror body and xhs-publish-btn disabled attributes. Uses Cloudl's
// named browser session so a long upload can be resumed without re-uploading.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, writeFileSync, statSync, existsSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { basename, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { cli, Strategy } from '@jyjyxt/cloudl/registry';
import { ArgumentError, CommandExecutionError, TimeoutError } from '@jyjyxt/cloudl/errors';
import { normalizeParagraphText } from '../_shared/publish-form.js';
const run = promisify(execFile);
export function validateMetadata(data) {
  if (!data || typeof data !== 'object' ||
      !['title', 'account', 'video'].every(key => typeof data[key] === 'string' && data[key].trim()) ||
      Array.from(data.title).length > 20 || typeof data.content !== 'string' || !data.content.trim() || Array.from(data.content).length > 1000)
    throw new ArgumentError('Require video, account, title (1–20 chars), content (1–1000 chars)');
  if (data.cover !== undefined)
    throw new ArgumentError('Custom cover file upload is not supported by this command. Prepare, upload/crop/save in the browser, then resume with cover_url instead of cover');
  if (data.cover_url !== undefined && (typeof data.cover_url !== 'string' || !/^https:\/\//.test(data.cover_url)))
    throw new ArgumentError('cover_url must be the HTTPS URL of the saved cover preview');
  return data;
}
export function assertCover(actual, data) {
  if (actual.coverEditing || !actual.coverUrl || !actual.coverReady || (data.cover_url && actual.coverUrl !== data.cover_url))
    throw new CommandExecutionError('Saved cover preview is missing, still being edited, or does not match cover_url. Save and inspect the crop before resuming; do not force-enable completion');
}
// Self-contained for the browser; note/editor text is never platform feedback.
export function readAcknowledgement() {
  return Array.from(document.querySelectorAll('body *')).some(element =>
    !Array.from(element.children).some(child => child.textContent.trim() === element.textContent.trim()) &&
    !element.closest('[contenteditable], .tiptap, .ProseMirror, textarea, input, script, style') &&
    element.getBoundingClientRect().width > 0 && /^发布成功[!！。]?$/.test(element.textContent.trim())
  );
}
export async function submitOnce({ state, persist, click, confirm }) {
  if (state.status === 'published') return state.result;
  if (state.status !== 'prepared') throw new CommandExecutionError('Previous submission unconfirmed; inspect creator notes before retrying');
  const pending = {...state, status: 'submitting', submitted_at: new Date().toISOString()};
  persist(pending);
  await click();
  const result = await confirm();
  persist({...pending, status: 'published', result});
  return result;
}
cli({
  site: 'xiaohongshu', name: 'publish-video', access: 'write',
  description: '上传视频并填写标题正文；默认仅准备，--execute 发布一次；支持命名浏览器会话续传',
  browser: false, strategy: Strategy.COOKIE,
  args: [
    { name: 'metadata', positional: true, required: true, help: 'JSON 文件：video、title、content、account；可选 cover_url（已保存封面预览）' },
    { name: 'session', default: 'xhs-video', help: 'Cloudl 浏览器会话名称' },
    { name: 'resume', type: 'bool', default: false, help: '复用已上传视频的会话，核对文件名后继续' },
    { name: 'execute', type: 'bool', default: false, help: '核对表单和上传完成后发布一次；失败不自动重试' },
    { name: 'timeout', type: 'int', default: 600, help: '等待上传完成的秒数' },
  ],
  columns: ['status', 'title', 'video', 'url'],
  func: async (args) => {
    const metadata = resolve(args.metadata);
    let data;
    try { data = JSON.parse(readFileSync(metadata, 'utf8')); }
    catch (e) { throw new ArgumentError(`Cannot read metadata: ${e.message}`); }
    validateMetadata(data);
    const file = resolve(data.video);
    let videoInfo;
    try { videoInfo = statSync(file); if (!videoInfo.isFile() || videoInfo.size === 0) throw new Error('Not a nonempty file'); }
    catch (e) { throw new ArgumentError(`Invalid video: ${e.message}`); }
    if (!/\.(mp4|mov|m4v)$/i.test(file)) throw new ArgumentError('Use mp4, mov or m4v');
    const seconds = Number(args.timeout);
    if (!Number.isInteger(seconds) || seconds < 1) throw new ArgumentError('timeout must be a positive integer');
    const statePath = metadata + '.state.json';
    const fingerprint = createHash('sha256').update(JSON.stringify({data, file, size: videoInfo.size, mtime: videoInfo.mtimeMs})).digest('hex');
    const locks = [statePath + '.lock', join(tmpdir(), `cloudl-xhs-video-${createHash('sha256').update(args.session || 'xhs-video').digest('hex')}.lock`)];
    const acquired = [];
    try {
      for (const lock of locks) {
        try { const fd = openSync(lock, 'wx', 0o600); closeSync(fd); acquired.push(lock); }
        catch (error) { throw new CommandExecutionError(`Cannot lock ${lock}: ${error.code}. Check for an active publisher before removing a stale lock`); }
      }
    let saved = {status: 'prepared', fingerprint};
    if (existsSync(statePath)) {
      let previous;
      try { previous = JSON.parse(readFileSync(statePath, 'utf8')); }
      catch (error) { throw new CommandExecutionError(`Cannot read publication receipt: ${error.message}`); }
      if (previous.status === 'submitting') throw new CommandExecutionError('Previous submission unconfirmed; inspect creator notes before retrying');
      if (previous.status === 'published') {
        if (previous.fingerprint !== fingerprint) throw new CommandExecutionError('Metadata/video changed after publication; retain the original receipt');
        return [previous.result];
      }
      if (previous.status !== 'prepared') throw new CommandExecutionError('Invalid publication receipt status');
    }
    const persist = value => writeFileSync(statePath, JSON.stringify(value, null, 2) + '\n', {mode: 0o600});
    async function browser(...parts) {
      try {
        const { stdout } = await run('cloudl', ['browser', args.session, ...parts], { timeout: 60000, maxBuffer: 2000000 });
        return JSON.parse(stdout);
      } catch (e) { throw new CommandExecutionError(`Cloudl browser failed: ${e.stderr || e.stdout || e.message}`); }
    }
    const evaluate = (js) => browser('eval', js);
    const snapshot = () => evaluate(`({url:location.href,text:document.body.innerText,feedback:(${readAcknowledgement.toString()})(),disabled:document.querySelector('xhs-publish-btn')?.getAttribute('submit-disabled')})`);
    if (!args.resume) await browser('open', 'https://creator.xiaohongshu.com/publish/publish?target=video');
    let state = await snapshot();
    if (!state.url.startsWith('https://creator.xiaohongshu.com/publish/publish') || !state.text.split('\n').includes(data.account))
      throw new CommandExecutionError('Wrong page or account; inspect session before proceeding');
    if (args.resume) {
      if (!state.text.split('\n').includes(basename(file))) throw new CommandExecutionError('Uploaded filename does not match metadata');
    } else {
      await browser('upload', 'input[type="file"][accept*=".mp4"]', file);
    }
    const end = Date.now() + seconds * 1000;
    while (true) {
      const found = await evaluate(`Boolean(document.querySelector('input[placeholder="填写标题会有更多赞哦"]') && document.querySelector('.tiptap.ProseMirror'))`);
      if (found) break;
      if (Date.now() > end) throw new TimeoutError('Video editor', seconds);
      await new Promise(r => setTimeout(r, 2000));
    }
    await browser('fill', 'input[placeholder="填写标题会有更多赞哦"]', data.title);
    try { await browser('fill', '.tiptap.ProseMirror', data.content); }
    catch (error) {
      // ProseMirror renders paragraphs with extra innerText line breaks.
      // Accept only an exact paragraph-text match, never a general fill error.
      const paragraphs = await evaluate(`({text:Array.from(document.querySelector('.tiptap.ProseMirror')?.children || []).map(p => p.textContent).join('\\n')})`);
      if (typeof paragraphs.text !== 'string' || normalizeParagraphText(paragraphs.text) !== normalizeParagraphText(data.content)) throw error;
    }
    while (true) {
      state = await snapshot();
      if (/上传失败|转码失败/.test(state.text)) throw new CommandExecutionError('Video upload/transcoding failed');
      if (state.disabled === 'false' && !/上传中\s*\d+%/.test(state.text)) break;
      if (Date.now() > end) throw new TimeoutError('Video upload / publish readiness', seconds);
      await new Promise(r => setTimeout(r, 3000));
    }
    const actual = await evaluate(`(() => {const cover=document.querySelector('img.cover');return {editorTitle:document.querySelector('input[placeholder="填写标题会有更多赞哦"]').value,editorBody:document.querySelector('.tiptap.ProseMirror').innerText,coverUrl:cover?.src || '',coverReady:!!cover?.complete && cover.naturalWidth>0,coverEditing:Array.from(document.querySelectorAll('button')).some(e=>e.innerText.trim()==='完成' && e.getBoundingClientRect().width>0)};})()`);
    const norm = normalizeParagraphText;
    if (actual.editorTitle !== data.title || norm(actual.editorBody) !== norm(data.content)) throw new CommandExecutionError('Form does not match metadata');
    assertCover(actual, data);
    persist(saved);
    if (!args.execute) return [{ status: 'prepared', title: data.title, video: file, url: state.url }];
    // The existing Cloudl image publisher uses this same UI component handler.
    // Invoke only once. A missing/ambiguous acknowledgement must never retry.
    const result = await submitOnce({state: saved, persist,
      click: async () => {
        const clicked = await evaluate(`(() => {const h=document.querySelector('xhs-publish-btn');if(!h || h.getAttribute('submit-disabled')!=='false')return false;if(typeof h._onPublish!=='function')return false;h._onPublish();return true;})()`);
        if (!clicked) throw new CommandExecutionError('Publish handler unavailable; inspect the session before reconciling the submitting receipt');
      },
      confirm: async () => {
        for (let n = 0; n < 20; n++) {
          await new Promise(r => setTimeout(r, 1500));
          state = await snapshot();
          if (state.feedback) return { status: 'published', title: data.title, video: file, url: state.url };
        }
        throw new CommandExecutionError('Submission sent once but success unconfirmed. Check creator notes before any retry.');
      }
    });
    return [result];
    } finally {
      for (const lock of acquired.reverse()) unlinkSync(lock);
    }
  },
});
