import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getRegistry } from '@jyjyxt/cloudl/registry';
import { normalizeDeclaration, validateMetadata, previousResult, submitOnce, assertPrepared, assertPublished, pageAction, publishVideo } from './publish-video.js';

const data = () => ({ video: '/tmp/demo.mp4', account: 'tester', title: 'AI的6种用法', caption: '完整描述\n\n包含来源和 #AI' });
const prepared = d => ({ account: d.account, title: d.title, shortTitle: d.title, caption: d.caption, savedCaption: d.caption,
  files: [{ name: 'demo.mp4', size: 4 }], canPost: true, preview: true, uploading: false, hasLocation: false, scheduled: false,
  unlabelled: normalizeDeclaration(d.declaration) === '无需标注', declaration: normalizeDeclaration(d.declaration),
  declarationType: normalizeDeclaration(d.declaration) === '个人观点，仅供参考' ? 8 : undefined,
  declarationSaved: true, originalAvailable: true, original: d.original === true });
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
  let url = '', uploaded = false, submitted = false, declaration = normalizeDeclaration(d.declaration);
  const calls = [];
  const browser = vi.fn(async (command, script) => {
    if (command === 'open') { url = script; calls.push(['open', url]); return { url }; }
    if (command === 'upload') { calls.push(['upload']); if (options.uploadError) throw Error('upload transport lost'); uploaded = true; return { uploaded: true }; }
    const [action, payload] = JSON.parse('[' + script.slice(script.lastIndexOf(')(') + 2, -1) + ']');
    calls.push([action, payload]);
    if (action === 'snapshot') {
      const posts = (submitted || options.existing) ? [{ id: 'export/new', text: d.caption + '\n2026-09-19', original: options.original !== false && d.original === true }] : [];
      if (url.includes('/list')) return { account: options.account || d.account, url, text: '视频管理\n发表视频', posts };
      return { ...prepared({ ...d, declaration }), url, editor: true, posts: [], account: options.account || d.account,
        originalAvailable: options.originalAvailable !== false, files: uploaded ? prepared(d).files : [], savedCaption: options.unsynced ? '' : d.caption };
    }
    if (action === 'declaration') { declaration = payload.declaration; return true; }
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
  it.each([{ account: '' }, { title: '字'.repeat(17) }, { title: 'a\nb' }, { title: '标题，逗号' }, { title: 'title,comma' }, { caption: '' }, { caption: '字'.repeat(1001) }, { declaration: '含AI生成内容' }])('rejects unsupported metadata %j', patch => {
    expect(() => validateMetadata({ ...data(), ...patch })).toThrow();
  });
  it('defaults to the platform personal-opinion label and requires current option names', () => {
    expect(normalizeDeclaration()).toBe('个人观点，仅供参考');
    expect(normalizeDeclaration('无需标注')).toBe('无需标注');
    expect(() => normalizeDeclaration('作者观点，仅供参考')).toThrow();
    expect(() => normalizeDeclaration('作者个人观点，仅供参考')).toThrow();
  });
  it('validates original metadata and registers the explicit flag', () => {
    expect(validateMetadata({ ...data(), original: true }).original).toBe(true);
    expect(() => validateMetadata({ ...data(), original: 'yes' })).toThrow('boolean');
    expect(getRegistry().get('wechat-channels/publish-video').args.find(a => a.name === 'original').default).toBe(false);
  });
  it('requires original permission and checked state before submission', () => {
    const d = { ...data(), original: true };
    expect(() => assertPrepared(prepared(d), d, { path: '/tmp/demo.mp4', size: 4 })).not.toThrow();
    for (const patch of [{ original: false }, { originalAvailable: false }])
      expect(() => assertPrepared({ ...prepared(d), ...patch }, d, { path: '/tmp/demo.mp4', size: 4 })).toThrow('original');
  });
  it('refuses publication when the account lacks original access', async () => {
    const f = fixture(), b = browserFixture(f.d, { originalAvailable: false });
    await expect(publishVideo({ ...f.args, original: true, execute: true }, b.browser)).rejects.toThrow('原创');
    expect(b.calls.some(c => ['upload', 'submit'].includes(c[0]))).toBe(false);
  });
  it('checks original status in the saved published record', () => {
    const d = { ...data(), original: true };
    const record = { account: d.account, objectId: 'export/new', publishedTitle: d.title, publishedCaption: d.caption };
    expect(() => assertPublished(record, d, 'export/new')).toThrow('original');
    expect(assertPublished({ ...record, original: true }, d, 'export/new').original).toBe(true);
  });
  it('publishes with original and rejects a conflicting retry', async () => {
    const f = fixture(); f.d.original = true; writeFileSync(f.metadata, JSON.stringify(f.d));
    const b = browserFixture(f.d);
    const result = await publishVideo({ ...f.args, execute: true }, b.browser);
    expect(result[0].original).toBe(true);
    expect(b.calls.filter(c => c[0] === 'original')).toHaveLength(1);
    expect(b.calls.filter(c => c[0] === 'submit')).toHaveLength(1);
    delete f.d.original; writeFileSync(f.metadata, JSON.stringify(f.d));
    const unused = vi.fn();
    await expect(publishVideo({ ...f.args, execute: true }, unused)).rejects.toThrow('differs');
    expect(unused).not.toHaveBeenCalled();
  });
  it('accepts CJK text and multiline captions', () => expect(validateMetadata(data())).toEqual(data()));
  it('rejects visible-only captions, wrong files, locations and schedules', () => {
    for (const patch of [{ savedCaption: '' }, { shortTitle: '' }, { files: [] }, { hasLocation: true }, { scheduled: true }, { declarationSaved: false }, { account: 'other' }]) {
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
    expect(b.calls.at(-1)[0]).toBe('restore-upload');
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
    const receipt = JSON.parse(readFileSync(f.statePath));
    expect(receipt.status).toBe(options.submitError ? 'submitting' : 'published_unverified');
    if (options.badPublished) expect(receipt.object_id).toBe('export/new');
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
  it('defaults to personal opinion without changing the caption and does not resubmit', async () => {
    const f = fixture();
    const b = browserFixture(f.d);
    const result = await publishVideo({ ...f.args, execute: true }, b.browser);
    expect(result[0]).toMatchObject({ status: 'published', declaration: '个人观点，仅供参考', declaration_verified: false });
    expect(b.calls.find(c => c[0] === 'declaration')[1]).toMatchObject({ declaration: '个人观点，仅供参考', caption: f.d.caption });
    expect(b.calls.filter(c => c[0] === 'submit')).toHaveLength(1);
    f.d.declaration = '个人观点，仅供参考'; writeFileSync(f.metadata, JSON.stringify(f.d));
    const unused = vi.fn(); expect(await publishVideo(f.args, unused)).toEqual(result); expect(unused).not.toHaveBeenCalled();
  });
  it('requires the selected declaration to match the saved model', () => {
    const d = { ...data(), declaration: '个人观点，仅供参考' };
    for (const patch of [{ declaration: '无需标注' }, { declarationType: 2 }, { declarationSaved: false }])
      expect(() => assertPrepared({ ...prepared(d), ...patch }, d, { path: d.video, size: 4 })).toThrow('declaration');
  });
  it('reports only observed declaration readback and rejects a conflicting saved label', () => {
    const d = { ...data(), declaration: '个人观点，仅供参考' };
    const record = { account: d.account, objectId: 'export/new', publishedTitle: d.title, publishedCaption: d.caption };
    expect(assertPublished(record, d, 'export/new').declaration_verified).toBe(false);
    expect(assertPublished({ ...record, publishedDeclaration: d.declaration }, d, 'export/new').declaration_verified).toBe(true);
    expect(() => assertPublished({ ...record, publishedDeclaration: '无需标注' }, d, 'export/new')).toThrow('declaration');
  });
  it('registers a declaration option and blocks changed declaration retries', async () => {
    expect(getRegistry().get('wechat-channels/publish-video').args.some(a => a.name === 'declaration')).toBe(true);
    const f = fixture(), b = browserFixture(f.d);
    await publishVideo({ ...f.args, execute: true }, b.browser);
    const unused = vi.fn();
    await expect(publishVideo({ ...f.args, declaration: '无需标注' }, unused)).rejects.toThrow('changed');
    expect(unused).not.toHaveBeenCalled();
  });
  it('uses the CLI declaration override while retaining the original caption', async () => {
    const f = fixture(), b = browserFixture(f.d);
    const result = await publishVideo({ ...f.args, declaration: '个人观点，仅供参考', execute: true }, b.browser);
    expect(result[0].declaration).toBe('个人观点，仅供参考');
    expect(b.calls.find(c => c[0] === 'fill')[1].caption).toBe(f.d.caption);
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
  it('clicks the original agreement flow and verifies the saved editor flag', async () => {
    const f = dom();
    const owner = { $data: { checkOriginalFlag: false }, checkOriginalFlag: false, canShowOriginalMark: true };
    f.root.querySelector('body').__vue__ = owner;
    const container = f.dom.window.document.createElement('div');
    container.innerHTML = '<div class="declare-original-checkbox"><input type="checkbox"></div><div class="declare-original-dialog"><div class="original-proto-wrapper"><input type="checkbox"></div><button disabled>声明原创</button></div>';
    f.root.querySelector('body').appendChild(container);
    const box = container.querySelector('.declare-original-checkbox input');
    const dialog = container.querySelector('.declare-original-dialog');
    const agreement = dialog.querySelector('input');
    const button = dialog.querySelector('button');
    let opened = false;
    dialog.getBoundingClientRect = () => ({ width: opened ? 500 : 0 });
    button.getBoundingClientRect = () => ({ width: 100 });
    box.addEventListener('click', () => { opened = true; });
    agreement.addEventListener('click', () => { button.disabled = !agreement.checked; });
    button.addEventListener('click', () => { owner.checkOriginalFlag = true; opened = false; });
    await f.action('original');
    expect(agreement.checked).toBe(true);
    expect((await f.action('snapshot')).original).toBe(true);
    await f.action('original');
    expect(opened).toBe(false);
    owner.canShowOriginalMark = false;
    await expect(f.action('original')).rejects.toThrow('原创');
    f.dom.window.close();
  });
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
  it('recognizes the current account header and refuses ambiguous accounts', async () => {
    const f = dom();
    const old = f.dom.window.document.querySelector('.account-info');
    old.outerHTML = '<h2 class="finder-nickname">tester</h2>';
    expect((await f.action('snapshot')).account).toBe('tester');
    const conflict = f.dom.window.document.createElement('div'); conflict.className = 'finder-nickname'; conflict.innerText = 'another account';
    f.root.append(conflict);
    expect((await f.action('snapshot')).account).toBeUndefined();
    f.dom.window.close();
  });
  it('reads the actual mounted user store when the compact sidebar has no nickname', async () => {
    const f = dom(); f.dom.window.document.querySelector('.account-info').remove();
    const app = f.dom.window.document.createElement('div'); app.id = 'app';
    const userStore = { user: { nickname: 'operator' }, finder: { nickname: 'tester' } }; userStore.self = userStore;
    app.__vue__ = { $data: { userStore } }; f.dom.window.document.body.append(app);
    expect((await f.action('snapshot')).account).toBe('tester');
    f.dom.window.close();
  });
  it('reads the compact sidebar store and skips same-route navigation', async () => {
    const f = dom(); f.dom.window.document.querySelector('.account-info').remove();
    const app = f.dom.window.document.createElement('div'); app.id = 'app';
    const push = vi.fn();
    app.__vue__ = { $router: { push }, $data: { uiStore: { rootStore: { userStore: {
      user: { nickname: 'operator' }, finder: { nickname: 'tester' }
    } } } } }; f.dom.window.document.body.append(app);
    expect((await f.action('snapshot')).account).toBe('tester');
    expect(await f.action('navigate', { url: f.dom.window.location.href })).toBe(true);
    expect(push).not.toHaveBeenCalled(); f.dom.window.close();
  });
  it('selects the video label through the real control and checks both Vue models', async () => {
    const f = dom();
    const container = f.dom.window.document.createElement('div'); container.className = 'post-create-wrap';
    container.innerHTML = '<div class="post-with-mark-tag"><div class="select-display">选择视频标注</div><div class="mark-tag-option"><div class="option-main">个人观点，仅供参考</div></div></div>';
    f.root.querySelector('body').append(container);
    const mark = container.querySelector('.post-with-mark-tag');
    const owner = { selectedTag: null, showOptions: false };
    mark.__vue__ = owner; container.__vue__ = { tagInfo: null };
    mark.querySelector('.select-display').addEventListener('click', () => { owner.showOptions = true; });
    const option = mark.querySelector('.option-main'); option.getBoundingClientRect = () => ({ width: owner.showOptions ? 200 : 0 });
    option.addEventListener('click', () => { owner.selectedTag = { tagName: '个人观点，仅供参考', tagType: 8 }; container.__vue__.tagInfo = { tagType: 8 }; owner.showOptions = false; });
    const d = { ...data(), declaration: '个人观点，仅供参考' };
    await f.action('fill', d);
    expect(await f.action('declaration', d)).toBe(true);
    expect((await f.action('snapshot'))).toMatchObject({ declaration: d.declaration, declarationType: 8, declarationSaved: true });
    expect(f.editor.innerText).toBe(d.caption);
    container.__vue__.tagInfo = { tagType: 2 };
    expect((await f.action('snapshot')).declarationSaved).toBe(false);
    await expect(f.action('submit', d)).rejects.toThrow('declaration changed');
    f.dom.window.close();
  });
  it('uses the mounted router for same-origin creator navigation', async () => {
    const f = dom();
    const app = f.dom.window.document.createElement('div'); app.id = 'app';
    const push = vi.fn(); app.__vue__ = { $router: { push } }; f.dom.window.document.body.append(app);
    expect(await f.action('navigate', { url: 'https://channels.weixin.qq.com/platform/post/list' })).toBe(true);
    expect(push).toHaveBeenCalledWith('/platform/post/list');
    await expect(f.action('navigate', { url: 'https://example.com/platform' })).rejects.toThrow('Unexpected');
    f.dom.window.close();
  });
});
