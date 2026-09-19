import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getRegistry } from '@jyjyxt/cloudl/registry';
import { validateMetadata, previousResult, submitOnce, assertPrepared, assertPublished, pageAction, publishVideo } from './publish-video.js';

const data = () => ({ video: '/tmp/demo.mp4', account: 'tester', title: 'AI的6种用法', caption: '完整描述\n\n包含来源和 #AI' });
const prepared = d => ({ account: d.account, title: d.title, shortTitle: d.title, caption: d.caption, savedCaption: d.caption,
  files: [{ name: 'demo.mp4', size: 4 }], canPost: true, preview: true, uploading: false, hasLocation: false, scheduled: false, unlabelled: true });
const dirs = [];
afterEach(() => { for (const path of dirs.splice(0)) rmSync(path, { recursive: true, force: true }); });

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'cloudl-wechat-video-')); dirs.push(dir);
  const d = { ...data(), video: join(dir, 'demo.mp4') };
  writeFileSync(d.video, Buffer.from([0, 0, 0, 1]));
  const metadata = join(dir, 'metadata.json'); writeFileSync(metadata, JSON.stringify(d));
  return { d, metadata, statePath: metadata + '.state.json', args: { metadata, session: dir, timeout: 30 } };
}

// Browser boundary fake; the actual page-side synchronization is covered separately below.
function browserFixture(d, options = {}) {
  let url = '', uploaded = false, submitted = false;
  const calls = [];
  const browser = vi.fn(async (command, script) => {
    if (command === 'open') { url = script; calls.push(['open', url]); return { url }; }
    if (command === 'upload') { calls.push(['upload']); if (options.uploadError) throw Error('upload transport lost'); uploaded = true; return { uploaded: true }; }
    const [action] = JSON.parse('[' + script.slice(script.lastIndexOf(')(') + 2, -1) + ']');
    calls.push([action]);
    if (action === 'snapshot') {
      const posts = (submitted || options.existing) ? [{ id: 'export/new', text: d.caption + '\n2026-09-19' }] : [];
      if (url.includes('/list')) return { account: options.account || d.account, url, text: '视频管理\n发表视频', posts };
      return { ...prepared(d), url, editor: true, posts: [], account: options.account || d.account,
        files: uploaded ? prepared(d).files : [], savedCaption: options.unsynced ? '' : d.caption };
    }
    if (action === 'submit') {
      submitted = true; url = 'https://channels.weixin.qq.com/platform/post/list';
      if (options.submitError) throw Error('ack lost');
    }
    if (action === 'published') return { ready: true, account: d.account, objectId: 'export/new', url,
      publishedTitle: d.title, publishedCaption: options.badPublished ? '' : d.caption };
    return true;
  });
  return { browser, calls };
}

describe('wechat-channels publish-video', () => {
  it('registers separately from publish, with explicit execution', () => {
    const c = getRegistry().get('wechat-channels/publish-video');
    expect(c.access).toBe('write'); expect(c.browser).toBe(false);
    expect(c.args.find(a => a.name === 'execute').default).toBe(false);
  });
  it.each([{ account: '' }, { title: '字'.repeat(17) }, { title: 'a\nb' }, { caption: '' }, { caption: '字'.repeat(1001) }, { declaration: '含AI生成内容' }])('rejects unsupported metadata %j', patch => {
    expect(() => validateMetadata({ ...data(), ...patch })).toThrow();
  });
  it('accepts CJK text and multiline captions', () => expect(validateMetadata(data())).toEqual(data()));
  it('rejects visible-only captions, wrong files, locations and schedules', () => {
    for (const patch of [{ savedCaption: '' }, { shortTitle: '' }, { files: [] }, { hasLocation: true }, { scheduled: true }, { unlabelled: false }, { account: 'other' }]) {
      expect(() => assertPrepared({ ...prepared(data()), ...patch }, data(), { path: '/tmp/demo.mp4', size: 4 })).toThrow();
    }
  });
  it('requires exact published metadata and the requested object ID', () => {
    const p = { account: 'tester', objectId: 'export/new', publishedTitle: data().title, publishedCaption: data().caption };
    expect(assertPublished(p, data(), 'export/new').metadata_verified).toBe(true);
    for (const patch of [{ objectId: 'old' }, { publishedCaption: '' }, { publishedTitle: '' }, { account: 'other' }]) {
      expect(() => assertPublished({ ...p, ...patch }, data(), 'export/new')).toThrow();
    }
  });
  it('blocks uncertain receipts even after metadata edits', () => {
    expect(() => previousResult({ status: 'submitting', fingerprint: 'a' }, 'a')).toThrow('unconfirmed');
    expect(() => previousResult({ status: 'submitting', fingerprint: 'a' }, 'b', 'export/new')).toThrow('changed');
  });
  it('writes submitting before a click and never retries an ambiguous click', async () => {
    const order = [], click = vi.fn(async () => { order.push('click'); throw Error('lost'); });
    await expect(submitOnce({ state: { status: 'prepared' }, persist: s => order.push(s.status), click, verify: vi.fn() })).rejects.toThrow('lost');
    expect(order).toEqual(['submitting', 'click']); expect(click).toHaveBeenCalledTimes(1);
  });
  it('prepares without publishing and restores the upload input', async () => {
    const f = fixture(), b = browserFixture(f.d);
    expect((await publishVideo(f.args, b.browser))[0].status).toBe('prepared');
    expect(b.calls.map(c => c[0])).toContain('restore-upload');
    expect(b.calls.map(c => c[0])).not.toContain('submit');
    expect(existsSync(f.statePath + '.lock')).toBe(false);
  });
  it('restores the input after an upload error and retains a resumable receipt', async () => {
    const f = fixture(), b = browserFixture(f.d, { uploadError: true });
    await expect(publishVideo(f.args, b.browser)).rejects.toThrow('upload transport lost');
    expect(b.calls.at(-1)).toEqual(['restore-upload']);
    expect(JSON.parse(readFileSync(f.statePath)).status).toBe('prepared');
  });
  it.each([{ account: 'someone else' }, { unsynced: true }])('never submits when verification fails: %j', options => {
    const f = fixture(), b = browserFixture(f.d, options);
    return expect(publishVideo({ ...f.args, execute: true }, b.browser)).rejects.toThrow().then(() => {
      expect(b.calls.map(c => c[0])).not.toContain('submit');
    });
  });
  it('publishes once, verifies the saved record and reuses the receipt', async () => {
    const f = fixture(), b = browserFixture(f.d);
    const result = await publishVideo({ ...f.args, execute: true }, b.browser);
    expect(result[0].status).toBe('published'); expect(result[0].object_id).toBe('export/new');
    const unused = vi.fn();
    expect(await publishVideo({ ...f.args, execute: true }, unused)).toEqual(result);
    expect(unused).not.toHaveBeenCalled();
    expect(b.calls.filter(c => c[0] === 'submit')).toHaveLength(1);
  });
  it.each([{ submitError: true }, { badPublished: true }])('leaves uncertain state, blocks repeat, and allows read-only recovery: %j', async options => {
    const f = fixture(), b = browserFixture(f.d, options);
    await expect(publishVideo({ ...f.args, execute: true }, b.browser)).rejects.toThrow();
    expect(JSON.parse(readFileSync(f.statePath)).status).toBe('submitting');
    const unused = vi.fn();
    await expect(publishVideo({ ...f.args, execute: true }, unused)).rejects.toThrow('unconfirmed');
    expect(unused).not.toHaveBeenCalled();
    const recovery = browserFixture(f.d, { existing: true });
    expect((await publishVideo({ ...f.args, verify: 'export/new' }, recovery.browser))[0].status).toBe('published');
    expect(recovery.calls.some(c => ['upload', 'submit', 'fill'].includes(c[0]))).toBe(false);
  });
  it('refuses to upload when the list already contains matching content', async () => {
    const f = fixture(), b = browserFixture(f.d, { existing: true });
    await expect(publishVideo({ ...f.args, execute: true }, b.browser)).rejects.toThrow('already exists');
    expect(b.calls.some(c => ['upload', 'submit'].includes(c[0]))).toBe(false);
  });
  it('does not remove another active publisher lock', async () => {
    const f = fixture(); writeFileSync(f.statePath + '.lock', 'active');
    await expect(publishVideo(f.args, vi.fn())).rejects.toThrow('Cannot lock');
    expect(readFileSync(f.statePath + '.lock', 'utf8')).toBe('active');
  });
});

describe('actual browser-side editor operations', () => {
  function dom() {
    const dom = new JSDOM('<div class="account-info"><span class="name">tester</span></div><wujie-app></wujie-app>', { url: 'https://channels.weixin.qq.com/platform/post/create', runScripts: 'outside-only' });
    const w = dom.window;
    Object.defineProperty(w.HTMLElement.prototype, 'innerText', { get() { return this.textContent; }, set(t) { this.textContent = t; }, configurable: true });
    const root = w.document.querySelector('wujie-app').attachShadow({ mode: 'open' });
    const body = w.document.createElement('body'); root.appendChild(body);
    body.innerHTML = '<div id="title"><input placeholder="填写短标题"></div><div id="description"><div contenteditable="" data-placeholder="添加描述"></div></div><div id="upload"><input id="original" type="file" accept="video/mp4"><span>end</span></div>';
    const editor = root.querySelector('[contenteditable]');
    const vm = { postStore: { postObjDesc: { description: '' } }, updateDescData: vi.fn(function () { this.postStore.postObjDesc.description = editor.innerText; }) };
    editor.parentElement.__vue__ = vm;
    const title = root.querySelector('input[placeholder]');
    title.parentElement.__vue__ = { $data: { shortTitle: '' } };
    title.addEventListener('input', () => { title.parentElement.__vue__.$data.shortTitle = title.value; });
    const action = w.eval('(' + pageAction.toString() + ')');
    return { dom, root, action, editor, vm, title };
  }
  it('synchronizes the editor model, not just the visible caption', async () => {
    const f = dom();
    await f.action('fill', data());
    expect(f.vm.updateDescData).toHaveBeenCalledTimes(1);
    expect(f.vm.postStore.postObjDesc.description).toBe(data().caption);
    expect(f.title.parentElement.__vue__.$data.shortTitle).toBe(data().title);
    expect((await f.action('snapshot')).savedCaption).toBe(data().caption);
    f.dom.window.close();
  });
  it('fails closed if the editor synchronization handler disappears', async () => {
    const f = dom(); delete f.vm.updateDescData;
    await expect(f.action('fill', data())).rejects.toThrow('contract changed'); f.dom.window.close();
  });
  it('temporarily exposes the same file input and restores its position and ID', async () => {
    const f = dom(), input = f.root.querySelector('input[type=file]'), parent = input.parentNode, next = input.nextSibling;
    await f.action('expose-upload');
    expect(f.dom.window.document.querySelector('#cloudl_wechat_video_input')).toBe(input);
    await f.action('restore-upload');
    expect(input.parentNode).toBe(parent); expect(input.nextSibling).toBe(next); expect(input.id).toBe('original');
    f.dom.window.close();
  });
});
