import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { getRegistry } from '@jyjyxt/cloudl/registry';
import { inspectPage, validateMetadata, assertReady, parseCreatorItems, findReceipt, runPublish } from './publish-video.js';

const folders = [];
afterEach(() => { for (const path of folders.splice(0)) rmSync(path, { recursive: true, force: true }); });
const valid = () => ({ video: '/tmp/video.mp4', account: 'creator', caption: 'Useful ideas\n#learning', visibility: 'private', ai_generated: true });
const post = (id = '900002') => ({ item_id: id, desc: valid().caption, post_time: 1800000000, author: { unique_id: 'creator' } });
const response = items => ({ ok: true, status: 200, data: { status_code: 0, item_list: items } });

function harness(options = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'cloudl-tiktok-test-')); folders.push(dir);
  const video = join(dir, 'video.mp4'); writeFileSync(video, 'video');
  const data = { ...valid(), video, ...options.metadata };
  const metadata = join(dir, 'metadata.json'); writeFileSync(metadata, JSON.stringify(data));
  const file = { name: 'video.mp4', size: 5 };
  const s = { location: 'https://www.tiktok.com/tiktokstudio/upload', identity: { handle: 'creator', uid: '123' },
    files: [], editorText: null, privacyText: 'Everyone', aiChecked: false, nowChecked: true,
    branded: false, canPost: false, pageText: '', challenge: false, dialogs: [], modelText: null, captionFullySelected: false };
  let posted = false, clock = 1800000000000;
  const browser = vi.fn(async (...args) => {
    if (args[0] === 'open') { if (options.identity) s.identity = options.identity; return {}; }
    if (args[0] === 'upload') {
      s.files = [{ key: 'bound-file', ...file, uploadPhase: 'UPLOAD_COMPLETE' }]; s.editorText = 'video'; s.modelText = 'video'; s.canPost = true;
      return {};
    }
    if (args[0] === 'fill') { s.editorText = args[2]; return {}; }
    if (args[0] === 'eval' && args[1].includes("document.execCommand('selectAll'")) { s.captionFullySelected = true; return true; }
    if (args[0] === 'eval' && args[1].includes("new ClipboardEvent('paste'")) { s.editorText = data.caption; s.modelText = data.caption; return true; }
    if (args[0] === 'click') {
      if (args[1].includes('data-value')) s.privacyText = { private: 'Only you', public: 'Everyone', friends: 'Friends' }[data.visibility];
      if (args[1].includes('aigc_container')) s.aiChecked = !s.aiChecked;
      if (args[1].includes('post_video_button')) {
        // Durable state must already be uncertain before any external write.
        expect(JSON.parse(readFileSync(metadata + '.state.json')).status).toBe('submitting');
        posted = true;
        if (options.clickError) throw new Error('transport lost');
      }
      return {};
    }
    if (args[0] === 'eval' && args[1].startsWith('(function inspectPage')) {
      const snapshot = structuredClone(s);
      if (options.finalMismatch && snapshot.canPost && snapshot.editorText === data.caption) snapshot.identity.handle = 'other';
      return snapshot;
    }
    if (args[0] === 'eval' && args[1].includes('/tiktok/creator/manage/item_list/v1/')) {
      if (options.lookupError) return { ok: false, status: 500 };
      return response(posted && !options.noReceipt ? [post()] : [post('900001')]);
    }
    return true;
  });
  return { metadata, data, s, file, browser, deps: { browser, now: () => clock, sleep: async ms => { clock += ms; } } };
}

describe('TikTok publish-video', () => {
  it('registers preparation by default with explicit write access', () => {
    const command = getRegistry().get('tiktok/publish-video');
    expect(command.access).toBe('write'); expect(command.browser).toBe(false);
    expect(command.args.find(a => a.name === 'execute').default).toBe(false);
  });
  it.each([{ account: '@creator' }, { account: '' }, { caption: ' ' }, { caption: 'a'.repeat(4001) },
    { visibility: 'everyone' }, { ai_generated: undefined }, { ai_generated: 'false' }, { account_id: 123 }])('rejects invalid metadata %j', patch => {
    expect(() => validateMetadata({ ...valid(), ...patch })).toThrow();
  });
  it('reads the observed DOM and upload state without confusing a default form or sidebar with the active file', () => {
    const dom = new JSDOM(`<body>
      <div class="public-DraftEditor-content" contenteditable="true"></div>
      <button role="combobox"><div class="Select__triggerInner">Only you</div></button>
      <div data-e2e="aigc_container"><input role="switch" type="checkbox" checked></div>
      <input name="postSchedule" value="post_now" type="radio" checked>
      <button data-e2e="post_video_button">Post</button></body>`, { url: 'https://www.tiktok.com/tiktokstudio/upload', runScripts: 'outside-only' });
    const w = dom.window;
    w.document.querySelector('[contenteditable]').innerText = valid().caption;
    w.document.body.innerText = 'Uploaded';
    w.__Creator_Center_Context__ = { commonAppContext: { user: { uniqueId: 'creator', uid: '123' } } };
    w.webCreationStore = { getState: () => ({ uploader: { currentFileKey:'f', fileInfoMap: { f: { fileKey: 'f', rawFile: { name: 'video.mp4', size: 5 } } }, uploadStatusMap: { f: 'UPLOAD_COMPLETE' } }, form: {videoFormDataMap: {f: {mentionEditorStates: [{getCurrentContent:()=>({getPlainText:()=>valid().caption})}]}}} }) };
    const s = w.eval(`(${inspectPage.toString()})()`);
    expect(s.identity).toEqual({ handle: 'creator', uid: '123' });
    expect(() => assertReady(s, valid(), { name: 'video.mp4', size: 5 }, 'f')).not.toThrow();
    expect(() => assertReady({...s,modelText:s.editorText+' #learning'}, valid(), {name:'video.mp4',size:5}, 'f')).toThrow('Final TikTok form');
    w.document.querySelector('[data-e2e=post_video_button]').disabled = true;
    expect(w.eval(`(${inspectPage.toString()})()`).canPost).toBe(false);
    dom.window.close();
  });
  it('prepares the actual command path without a Post click or a receipt request', async () => {
    const h = harness(); const result = await runPublish({ metadata: h.metadata }, h.deps);
    expect(result[0]).toMatchObject({ status: 'prepared', caption: h.data.caption, videoId: null });
    expect(h.s.editorText).toBe(h.data.caption); // No AI wording injected into caption.
    expect(h.s.aiChecked).toBe(true); expect(h.s.privacyText).toBe('Only you');
    expect(h.browser.mock.calls.some(a => a[0] === 'click' && a[1].includes('post_video_button'))).toBe(false);
    expect(JSON.parse(readFileSync(h.metadata + '.state.json')).fileKey).toBe('bound-file');
    expect(existsSync(h.metadata + '.state.json.lock')).toBe(false);
  });
  it('reads blank Draft blocks once and accepts an active editor with a stale model focus flag', () => {
    const dom = new JSDOM(`<body><div class="public-DraftEditor-content" contenteditable="true" tabindex="0"><div data-block="true">First</div><div data-block="true"><br></div><div data-block="true">Last</div></div></body>`, { url: 'https://www.tiktok.com/tiktokstudio/upload', runScripts: 'outside-only' });
    const w = dom.window;
    const editor = w.document.querySelector('[contenteditable]');
    editor.innerText = 'First\n\n\nLast';
    w.webCreationStore = { getState: () => ({ uploader: { currentFileKey: 'f' }, form: { videoFormDataMap: { f: { mentionEditorStates: [{
      getCurrentContent: () => ({ getPlainText: () => 'First\n\nLast', getFirstBlock: () => ({ getKey: () => 'a' }), getLastBlock: () => ({ getKey: () => 'b', getLength: () => 4 }) }),
      getSelection: () => ({ toJS: () => ({ anchorKey: 'a', anchorOffset: 0, focusKey: 'b', focusOffset: 4, hasFocus: false }) }),
    }] } } } }) };
    editor.focus();
    const s = w.eval(`(${inspectPage.toString()})()`);
    expect(s.editorText).toBe('First\n\nLast');
    expect(s.captionFullySelected).toBe(true);
    editor.blur();
    expect(w.eval(`(${inspectPage.toString()})()`).captionFullySelected).toBe(false);
    dom.window.close();
  });
  it('resumes exactly the recorded upload without uploading again', async () => {
    const h = harness(); await runPublish({ metadata: h.metadata }, h.deps); h.browser.mockClear();
    await runPublish({ metadata: h.metadata, resume: true }, h.deps);
    expect(h.browser.mock.calls.some(a => a[0] === 'upload' || a[0] === 'open')).toBe(false);
    expect(h.browser.mock.calls.some(a => a[0] === 'eval' && a[1].includes("new ClipboardEvent('paste'"))).toBe(false);
    h.s.files[0].key = 'different-upload';
    await expect(runPublish({ metadata: h.metadata, resume: true }, h.deps)).rejects.toThrow('Uploaded file changed');
  });
  it('rejects unbound resume, wrong account and concurrent invocations before upload', async () => {
    const h = harness({ identity: { handle: 'someone_else', uid: '456' } });
    await expect(runPublish({ metadata: h.metadata, resume: true }, h.deps)).rejects.toThrow('Resume requires');
    await expect(runPublish({ metadata: h.metadata }, h.deps)).rejects.toThrow('account does not match');
    expect(h.browser.mock.calls.some(a => a[0] === 'upload')).toBe(false);
    writeFileSync(h.metadata + '.state.json.lock', 'busy');
    await expect(runPublish({ metadata: h.metadata }, h.deps)).rejects.toThrow('publication lock');
  });
  it('posts once, verifies a new exact matching creator item, and returns saved receipts on repeat calls', async () => {
    const h = harness(); const args = { metadata: h.metadata, execute: true };
    const result = await runPublish(args, h.deps);
    expect(result[0]).toMatchObject({ status: 'submitted', videoId: '900002', url: 'https://www.tiktok.com/@creator/video/900002' });
    expect(h.browser.mock.calls.filter(a => a[0] === 'click' && a[1].includes('post_video_button'))).toHaveLength(1);
    h.browser.mockClear(); expect(await runPublish(args, h.deps)).toEqual(result); expect(h.browser).not.toHaveBeenCalled();
    writeFileSync(h.metadata, JSON.stringify({ ...h.data, caption: 'changed' }));
    await expect(runPublish(args, h.deps)).rejects.toThrow('already submitted');
  });
  it.each([{ clickError: true }, { noReceipt: true }])('blocks a second submission after post-click uncertainty %j', async options => {
    const h = harness(options); const args = { metadata: h.metadata, execute: true };
    await expect(runPublish(args, h.deps)).rejects.toThrow();
    expect(JSON.parse(readFileSync(h.metadata + '.state.json')).status).toBe('submitting');
    h.browser.mockClear();
    await expect(runPublish(args, h.deps)).rejects.toThrow('unconfirmed'); expect(h.browser).not.toHaveBeenCalled();
    // Editing metadata cannot bypass uncertain state.
    writeFileSync(h.metadata, JSON.stringify({ ...h.data, caption: 'changed' }));
    await expect(runPublish(args, h.deps)).rejects.toThrow('unconfirmed');
  });
  it.each([{ finalMismatch: true }, { lookupError: true }])('does not post when final validation or baseline receipt lookup fails %j', async options => {
    const h = harness(options);
    await expect(runPublish({ metadata: h.metadata, execute: true }, h.deps)).rejects.toThrow();
    expect(h.browser.mock.calls.some(a => a[0] === 'click' && a[1].includes('post_video_button'))).toBe(false);
  });
  it('fails closed for malformed creator lists and does not confuse old or unrelated posts with success', () => {
    expect(parseCreatorItems(response([]))).toEqual([]);
    expect(parseCreatorItems({ ok: true, data: { status_code: 0, cursor: 0, has_more: false } })).toEqual([]);
    expect(() => parseCreatorItems({ ok: true, data: { status_code: 0, cursor: 0, has_more: true } })).toThrow();
    for (const r of [{ ok: false, status: 401 }, { ok: true, data: {} }, response([{}]), { ok: true, data: { status_code: 4, item_list: [] } }])
      expect(() => parseCreatorItems(r)).toThrow();
    expect(findReceipt([post('900001')], ['900001'], valid(), 1800000000000)).toBeNull();
    expect(findReceipt([{ ...post(), desc: 'unrelated' }], [], valid(), 1800000000000)).toBeNull();
    expect(findReceipt([{ ...post(), post_time: 1 }], [], valid(), 1800000000000)).toBeNull();
    expect(findReceipt([{ ...post(), author: { unique_id: 'other' } }], [], valid(), 1800000000000)).toBeNull();
    expect(() => findReceipt([post('900002'), post('900003')], [], valid(), 1800000000000)).toThrow('Multiple');
  });
});
