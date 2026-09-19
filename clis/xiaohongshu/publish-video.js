// Strategy: UI_SELECTOR; contract: visible-ui.
// Verified on 2026-09-19: creator video upload input, title placeholder,
// ProseMirror body and xhs-publish-btn disabled attributes. Uses Cloudl's
// named browser session so a long upload can be resumed without re-uploading.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { cli, Strategy } from '@jyjyxt/cloudl/registry';
import { ArgumentError, CommandExecutionError, TimeoutError } from '@jyjyxt/cloudl/errors';
const run = promisify(execFile);
cli({
  site: 'xiaohongshu', name: 'publish-video', access: 'write',
  description: '上传视频并填写标题正文；默认仅准备，--execute 发布一次；支持命名浏览器会话续传',
  browser: false, strategy: Strategy.COOKIE,
  args: [
    { name: 'metadata', positional: true, required: true, help: 'JSON 文件：video、title、content、account' },
    { name: 'session', default: 'xhs-video', help: 'Cloudl 浏览器会话名称' },
    { name: 'resume', type: 'bool', default: false, help: '复用已上传视频的会话，核对文件名后继续' },
    { name: 'execute', type: 'bool', default: false, help: '核对表单和上传完成后发布一次；失败不自动重试' },
    { name: 'timeout', type: 'int', default: 600, help: '等待上传完成的秒数' },
  ],
  columns: ['status', 'title', 'video', 'url'],
  func: async (args) => {
    let data;
    try { data = JSON.parse(readFileSync(resolve(args.metadata), 'utf8')); }
    catch (e) { throw new ArgumentError(`Cannot read metadata: ${e.message}`); }
    if (!data.title || Array.from(data.title).length > 20 || typeof data.content !== 'string' || !data.content.trim() || Array.from(data.content).length > 1000 || !data.account || !data.video)
      throw new ArgumentError('Require video, account, title (1–20 chars), content (1–1000 chars)');
    const file = resolve(data.video);
    try { if (!statSync(file).isFile()) throw new Error('Not a file'); }
    catch (e) { throw new ArgumentError(`Invalid video: ${e.message}`); }
    if (!/\.(mp4|mov|m4v)$/i.test(file)) throw new ArgumentError('Use mp4, mov or m4v');
    const seconds = Number(args.timeout);
    if (!Number.isInteger(seconds) || seconds < 1) throw new ArgumentError('timeout must be a positive integer');
    async function browser(...parts) {
      try {
        const { stdout } = await run('cloudl', ['browser', args.session, ...parts], { timeout: 60000, maxBuffer: 2000000 });
        return JSON.parse(stdout);
      } catch (e) { throw new CommandExecutionError(`Cloudl browser failed: ${e.stderr || e.stdout || e.message}`); }
    }
    const evaluate = (js) => browser('eval', js);
    const snapshot = () => evaluate(`({url:location.href,text:document.body.innerText,disabled:document.querySelector('xhs-publish-btn')?.getAttribute('submit-disabled')})`);
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
      if (paragraphs.text !== data.content) throw error;
    }
    while (true) {
      state = await snapshot();
      if (/上传失败|转码失败/.test(state.text)) throw new CommandExecutionError('Video upload/transcoding failed');
      if (state.disabled === 'false' && !/上传中\s*\d+%/.test(state.text)) break;
      if (Date.now() > end) throw new TimeoutError('Video upload / publish readiness', seconds);
      await new Promise(r => setTimeout(r, 3000));
    }
    const actual = await evaluate(`({title:document.querySelector('input[placeholder="填写标题会有更多赞哦"]').value,body:document.querySelector('.tiptap.ProseMirror').innerText})`);
    const norm = s => s.replace(/\r/g, '').replace(/\n+/g, '\n').trim();
    if (actual.title !== data.title || norm(actual.body) !== norm(data.content)) throw new CommandExecutionError('Form does not match metadata');
    if (!args.execute) return [{ status: 'prepared', title: data.title, video: file, url: state.url }];
    // The existing Cloudl image publisher uses this same UI component handler.
    // Invoke only once. A missing/ambiguous acknowledgement must never retry.
    const clicked = await evaluate(`(() => {const h=document.querySelector('xhs-publish-btn');if(!h || h.getAttribute('submit-disabled')!=='false')return false;if(typeof h._onPublish!=='function')return false;h._onPublish();return true;})()`);
    if (!clicked) throw new CommandExecutionError('Publish handler unavailable; no submission was made');
    for (let n = 0; n < 20; n++) {
      await new Promise(r => setTimeout(r, 1500));
      state = await snapshot();
      if (state.text.includes('发布成功')) return [{ status: 'published', title: data.title, video: file, url: state.url }];
    }
    throw new CommandExecutionError('Submission sent once but success unconfirmed. Check creator notes before any retry.');
  },
});
