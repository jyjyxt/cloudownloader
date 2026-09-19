// Visible UI contract verified 2026-09-19 on member.bilibili.com.
// Uses Cloudl named browser sessions; never replays an ambiguous submission.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { cli, Strategy } from '@jyjyxt/cloudl/registry';
import { ArgumentError, CommandExecutionError, TimeoutError } from '@jyjyxt/cloudl/errors';
const run = promisify(execFile);
const TITLE = 'input[placeholder="请输入稿件标题"]';
const DESCRIPTION = '[editor_id="desc_at_editor"] .ql-editor';
const TAG = 'input[placeholder="按回车键Enter创建标签"]';
const DECLARATION = 'input[placeholder="请选择符合您视频内容的创作声明"]';
const UPLOAD = 'input[type="file"][accept^=".mp4"]';
const DECLARATIONS = ['内容无需标注', '含AI生成内容', '含虚构演绎内容', '内容含营销信息', '个人观点，仅供参考'];
const norm = s => String(s ?? '').replace(/\r/g, '').trim();
export function validateMetadata(data) {
  if (!data || typeof data !== 'object') throw new ArgumentError('Metadata must be an object');
  for (const key of ['video', 'account', 'title', 'description', 'category', 'declaration']) {
    if (typeof data[key] !== 'string' || !data[key].trim()) throw new ArgumentError(`Require ${key}`);
  }
  if (Array.from(data.title).length > 80 || Array.from(data.description).length > 2000)
    throw new ArgumentError('Title max 80 characters; description max 2000 characters');
  if (!DECLARATIONS.includes(data.declaration)) throw new ArgumentError('Unsupported declaration; repost submissions are not supported');
  if (!Array.isArray(data.tags) || data.tags.length < 1 || data.tags.length > 10 ||
      data.tags.some(t => typeof t !== 'string' || !t.trim() || t !== t.trim() || Array.from(t).length > 20 || /[,\n\r]/.test(t)) ||
      new Set(data.tags).size !== data.tags.length) throw new ArgumentError('Require 1–10 unique tags, each 1–20 characters without commas/newlines');
  if (data.cover_index !== undefined && (!Number.isInteger(data.cover_index) || data.cover_index < 0))
    throw new ArgumentError('cover_index must be a nonnegative integer');
  return data;
}
export function submissionResult(snapshot, title) {
  if (!/投稿成功|发布成功|恭喜你上传第一个稿件，成为\s*UP\s*主/.test(snapshot.text || '')) return null;
  const bvid = [snapshot.url, ...(snapshot.links || []), snapshot.text].join(' ').match(/BV[1-9A-HJ-NP-Za-km-z]{10}/)?.[0] || '';
  return { status: 'submitted', title, bvid, url: bvid ? `https://www.bilibili.com/video/${bvid}` : snapshot.url };
}
export async function submitOnce({ state, persist, click, confirm }) {
  if (state.status === 'submitting') throw new CommandExecutionError('Previous submission is unconfirmed; inspect creator content before retrying');
  if (state.status === 'submitted') return state.result;
  // Persist BEFORE the click: a transport error must not cause a second post.
  persist({ ...state, status: 'submitting', submitted_at: new Date().toISOString() });
  await click();
  const result = await confirm();
  persist({ ...state, status: 'submitted', result });
  return result;
}
cli({
  site: 'bilibili', name: 'publish-video', access: 'write',
  description: '上传视频并填写投稿信息；默认仅准备，--execute 投稿一次，--resume 继续已有上传',
  browser: false, strategy: Strategy.COOKIE,
  args: [
    { name: 'metadata', positional: true, required: true, help: 'JSON: video, account, title, description, category, declaration, tags; optional account_id, cover_index' },
    { name: 'session', default: 'bilibili-publish', help: 'Cloudl 浏览器会话' },
    { name: 'resume', type: 'bool', default: false, help: '继续会话中同一文件的上传；核对文件名与大小' },
    { name: 'execute', type: 'bool', default: false, help: '信息核对且上传完成后立即投稿；不会自动重试提交' },
    { name: 'timeout', type: 'int', default: 900, help: '页面加载及视频上传等待秒数' },
  ],
  columns: ['status', 'title', 'bvid', 'url'],
  func: async args => {
    const metadata = resolve(args.metadata);
    let data;
    try { data = JSON.parse(readFileSync(metadata, 'utf8')); }
    catch (e) { throw new ArgumentError(`Cannot read metadata: ${e.message}`); }
    validateMetadata(data);
    const video = resolve(data.video);
    let file;
    try { file = statSync(video); } catch { throw new ArgumentError(`Video not found: ${video}`); }
    if (!file.isFile() || file.size === 0 || !/\.(mp4|mov|mkv|webm|m4v)$/i.test(video)) throw new ArgumentError('Require a nonempty mp4/mov/mkv/webm/m4v file');
    const timeout = Number(args.timeout ?? 900);
    if (!Number.isInteger(timeout) || timeout < 1 || timeout > 3600) throw new ArgumentError('timeout must be 1–3600 seconds');
    const statePath = metadata + '.state.json';
    const fingerprint = createHash('sha256').update(JSON.stringify({ data, video, size: file.size, mtime: file.mtimeMs })).digest('hex');
    let state = { status: 'prepared', fingerprint };
    if (existsSync(statePath)) {
      state = JSON.parse(readFileSync(statePath, 'utf8'));
      if (state.status === 'submitting') throw new CommandExecutionError('Previous submission unconfirmed; inspect creator content before retrying');
      if (state.status === 'submitted') {
        if (state.fingerprint !== fingerprint) throw new CommandExecutionError('Metadata belongs to an already submitted video');
        return [state.result];
      }
      state = { status: 'prepared', fingerprint };
    }
    const persist = value => writeFileSync(statePath, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
    const browser = async (...parts) => {
      try {
        const { stdout } = await run('cloudl', ['browser', args.session || 'bilibili-publish', ...parts], { timeout: 65000, maxBuffer: 3000000 });
        if (parts[0] === 'keys' && stdout.trim() === `Pressed: ${parts[1]}`) return { pressed: parts[1] };
        return JSON.parse(stdout);
      }
      catch (e) { throw new CommandExecutionError(`Cloudl browser failed: ${e.stderr || e.stdout || e.message}`); }
    };
    const evaluate = js => browser('eval', js);
    const snapshot = () => evaluate(`(() => {
      const tag = document.querySelector(${JSON.stringify(TAG)});
      return { url:location.href, text:document.body?.innerText || '',
        title:document.querySelector(${JSON.stringify(TITLE)})?.value,
        description:Array.from(document.querySelector(${JSON.stringify(DESCRIPTION)})?.children || []).map(e=>e.textContent).join('\\n'),
        declaration:document.querySelector(${JSON.stringify(DECLARATION)})?.value,
        category:document.querySelector('.video-human-type .select-item-cont')?.innerText.trim(),
        tags:Array.from(tag?.closest('.input-container')?.querySelectorAll('.label-item-v2-content') || []).map(e=>e.innerText.trim()),
        files:Array.from(document.querySelectorAll(${JSON.stringify(UPLOAD)})).flatMap(e=>Array.from(e.files||[]).map(f=>({name:f.name,size:f.size}))),
        cover:!!document.querySelector('.cover-main .cover-img')?.style.backgroundImage,
        progress:document.querySelector('.file-item-content-status-text')?.innerText || '',
        uploadStatus:document.querySelector('.task-status')?.innerText || '',
        submit:!!document.querySelector('.submit-add'),
        links:Array.from(document.querySelectorAll('a[href]')).map(e=>e.href)
      }; })()`);
    const wait = async (check, label) => {
      const end = Date.now() + timeout * 1000;
      while (Date.now() < end) { const value = await check(); if (value) return value; await new Promise(r=>setTimeout(r, 2500)); }
      throw new TimeoutError(label, timeout);
    };
    if (!args.resume) await browser('open', 'https://member.bilibili.com/platform/upload/video/frame');
    await wait(async () => (await snapshot()).url.startsWith('https://member.bilibili.com/platform/upload/video'), 'Bilibili upload page');
    await wait(() => evaluate(`!!document.querySelector(${JSON.stringify(UPLOAD)})`), 'Upload editor loading');
    // Read-only identity lookups may retry when the creator center is slow.
    const identity = await wait(async () => {
      const result = await evaluate(`fetch('https://api.bilibili.com/x/web-interface/nav',{credentials:'include',signal:AbortSignal.timeout(20000)}).then(r=>r.json()).then(r=>({code:r.code,login:r.data?.isLogin,name:r.data?.uname,id:String(r.data?.mid||'')})).catch(()=>({transient:true}))`);
      return result?.transient ? false : result;
    }, 'Account verification');
    if (identity.code !== 0 || !identity.login || identity.name !== data.account || (data.account_id && identity.id !== String(data.account_id)))
      throw new CommandExecutionError('Logged-in account does not match metadata');
    if (args.resume) {
      const s = await snapshot();
      if (s.files.length !== 1 || s.files[0].name !== basename(video) || s.files[0].size !== file.size)
        throw new CommandExecutionError('Resume file name/size mismatch or multiple uploaded files');
    } else {
      await wait(() => evaluate(`!!document.querySelector(${JSON.stringify(UPLOAD)})`), 'Upload input');
      if ((await snapshot()).title !== undefined) throw new CommandExecutionError('Existing upload found; use --resume after inspecting it');
      await browser('upload', UPLOAD, video, '--nth', '0');
    }
    await wait(async () => (await snapshot()).title !== undefined, 'Video editor');
    await evaluate(`(() => {document.querySelector('.forbid.btn')?.click();const e=Array.from(document.querySelectorAll('span')).find(x=>x.textContent==='知道了');e?.click();return true;})()`);
    await browser('fill', TITLE, data.title);
    try { await browser('fill', DESCRIPTION, data.description); }
    catch (e) { if (norm((await snapshot()).description) !== norm(data.description)) throw e; }
    await browser('click', DECLARATION);
    const declared = await evaluate(`(() => {const e=Array.from(document.querySelectorAll('li.bcc-option')).find(x=>x.innerText.trim()===${JSON.stringify(data.declaration)});if(!e)return false;e.click();return true;})()`);
    if (!declared) throw new CommandExecutionError('Declaration option not found');
    if ((await snapshot()).category !== data.category) {
      await browser('click', '.video-human-type .select-controller');
      const selected = await evaluate(`(() => {const e=Array.from(document.querySelectorAll('.drop-list-v2-item')).find(x=>x.getAttribute('title')===${JSON.stringify(data.category)});if(!e)return false;e.click();return true;})()`);
      if (!selected) throw new CommandExecutionError('Category option not found');
    }
    // Remove auto-generated tags, including unrelated recommendations.
    for (let n = 0; n < 10; n++) {
      const removed = await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(TAG)})?.closest('.input-container')?.querySelector('.tag-pre-wrp .close');if(!e)return false;e.dispatchEvent(new MouseEvent('click',{bubbles:true}));return true;})()`);
      if (!removed) break;
    }
    for (const tag of data.tags) {
      await browser('fill', TAG, tag, '--nth', '0');
      await browser('focus', TAG, '--nth', '0');
      // Bilibili's tag handler checks the legacy keyCode as well as key.
      await evaluate(`(() => {const e=document.querySelector(${JSON.stringify(TAG)});e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true}));return true;})()`);
      await wait(async () => (await snapshot()).tags.includes(tag), `Tag ${tag}`);
    }
    if (!(await snapshot()).cover) {
      await wait(() => evaluate(`document.querySelectorAll('.img-item-cover').length > ${data.cover_index ?? 0}`), 'Recommended video cover');
      await browser('click', '.img-item-cover', '--nth', String(data.cover_index ?? 0));
    }
    console.error('Metadata filled; waiting for video upload to finish...');
    let lastProgress = '', lastProgressAt = 0;
    await wait(async () => {
      const s = await snapshot();
      if (/上传失败|转码失败/.test(s.text)) throw new CommandExecutionError('Video upload/transcode failed');
      if (s.progress !== lastProgress && Date.now() - lastProgressAt > 15000) {
        console.error(s.progress.replace(/\n/g, ' '));
        lastProgress = s.progress; lastProgressAt = Date.now();
      }
      return /上传完成|上传成功/.test(s.text) && !/上传中\.\.\./.test(s.text);
    }, 'Video upload');
    const actual = await snapshot();
    if (actual.title !== data.title || norm(actual.description) !== norm(data.description) || actual.category !== data.category ||
        actual.declaration !== data.declaration || JSON.stringify(actual.tags) !== JSON.stringify(data.tags) || !actual.cover || !actual.submit)
      throw new CommandExecutionError('Final form does not match metadata, or cover/submit is unavailable');
    if (actual.files.length !== 1 || actual.files[0].name !== basename(video) || actual.files[0].size !== file.size)
      throw new CommandExecutionError('Uploaded file changed during preparation');
    persist(state);
    if (!args.execute) return [{ status: 'prepared', title: data.title, bvid: '', url: actual.url }];
    const result = await submitOnce({ state, persist,
      click: () => browser('click', '.submit-add'),
      confirm: async () => {
        for (let n = 0; n < 30; n++) {
          await new Promise(r=>setTimeout(r, 2000));
          const s = await snapshot();
          const acknowledged = submissionResult(s, data.title);
          if (acknowledged) return acknowledged;
        }
        throw new CommandExecutionError('Submission sent once but acknowledgement unconfirmed. Check creator content; do not retry blindly.');
      }
    });
    return [result];
  }
});
