import {afterEach, describe, expect, it, vi} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {getRegistry} from '@jyjyxt/cloudl/registry';
import {JSDOM} from 'jsdom';

const mocks = vi.hoisted(() => ({execFile: vi.fn()}));
vi.mock('node:child_process', () => {
  // Match execFile's custom promisify contract ({stdout, stderr}), not the
  // default callback promisify contract (stdout string).
  mocks.execFile[Symbol.for('nodejs.util.promisify.custom')] = (...args) => new Promise((resolve, reject) => {
    mocks.execFile(...args, (error, stdout, stderr) => error ? reject(error) : resolve({stdout, stderr}));
  });
  return {execFile: mocks.execFile};
});
import {validateMetadata, assertCover, submitOnce, readAcknowledgement} from './publish-video.js';

const roots = [];
afterEach(() => {
  vi.useRealTimers();
  mocks.execFile.mockReset();
  for (const root of roots.splice(0)) fs.rmSync(root, {recursive: true, force: true});
});
const valid = () => ({video: '/tmp/demo.mp4', account: 'tester', title: '中文标题', content: '正文与来源'});
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudl-xhs-video-'));
  roots.push(root);
  const file = path.join(root, 'demo.mp4');
  fs.writeFileSync(file, 'test video');
  const data = {...valid(), video: file};
  const metadata = path.join(root, 'metadata.json');
  fs.writeFileSync(metadata, JSON.stringify(data));
  const info = fs.statSync(file);
  const fingerprint = createHash('sha256').update(JSON.stringify({data, file, size: info.size, mtime: info.mtimeMs})).digest('hex');
  return {root, file, data, metadata, fingerprint, receipt: metadata + '.state.json'};
}

describe('xiaohongshu publish-video', () => {
  it.each([{title: 1}, {account: ''}, {title: '字'.repeat(21)}, {cover: '/tmp/image.png'}, {cover_url: 'file:///tmp/image.png'}])('rejects invalid or unapplied metadata %j', patch => {
    expect(() => validateMetadata({...valid(), ...patch})).toThrow();
  });
  it('blocks undecoded, mismatched and still-editing cover previews', () => {
    const data = {cover_url: 'https://example.com/cover.png'};
    expect(() => assertCover({coverUrl: data.cover_url, coverReady: true}, data)).not.toThrow();
    expect(() => assertCover({coverUrl: data.cover_url, coverReady: false}, data)).toThrow('Saved cover');
    expect(() => assertCover({coverUrl: 'https://example.com/default.png', coverReady: true}, data)).toThrow('Saved cover');
    expect(() => assertCover({coverEditing: true}, {})).toThrow('Saved cover');
    expect(() => assertCover({coverUrl: data.cover_url, coverReady: false}, {})).toThrow('Saved cover');
  });
  it('reads standalone success feedback outside the note editor', () => {
    const dom = new JSDOM('<body><div class="tiptap ProseMirror" contenteditable="true"><p>发布成功</p></div><div class="feedback"><svg></svg>发布成功！</div></body>', {runScripts: 'outside-only'});
    dom.window.HTMLElement.prototype.getBoundingClientRect = () => ({width: 20});
    const read = () => dom.window.eval(`(${readAcknowledgement.toString()})()`);
    expect(read()).toBe(true);
    dom.window.document.querySelector('.feedback').remove();
    expect(read()).toBe(false);
    dom.window.close();
  });
  it.each([false, true])('uses platform feedback, not success words in the body, through the registered command (%s)', async feedback => {
    vi.useFakeTimers();
    const f = fixture();
    const data = {...f.data, content: '本期介绍发布成功后的操作'};
    fs.writeFileSync(f.metadata, JSON.stringify(data));
    mocks.execFile.mockImplementation((binary, argv, options, callback) => {
      const action = argv[2], script = argv[3] || '';
      let result = {};
      if (action === 'eval') {
        if (script.includes('coverReady')) result = {editorTitle: data.title, editorBody: data.content, coverUrl: 'https://example.com/cover.png', coverReady: true, coverEditing: false};
        else if (script.includes('readAcknowledgement')) result = {url: 'https://creator.xiaohongshu.com/publish/publish?target=video', text: 'tester\ndemo.mp4\n' + data.content, disabled: 'false', feedback};
        else result = true;
      }
      callback(null, JSON.stringify(result), '');
    });
    const command = getRegistry().get('xiaohongshu/publish-video');
    const args = {metadata: f.metadata, timeout: 1, session: 'xhs-feedback-test', resume: true, execute: true};
    const pending = command.func(args).then(value => ({value}), error => ({error}));
    await vi.advanceTimersByTimeAsync(32000);
    const outcome = await pending;
    expect(mocks.execFile.mock.calls.filter(call => call[1][3]?.includes('h._onPublish()'))).toHaveLength(1);
    expect(JSON.parse(fs.readFileSync(f.receipt)).status).toBe(feedback ? 'published' : 'submitting');
    const calls = mocks.execFile.mock.calls.length;
    if (feedback) {
      expect(outcome.value[0].status).toBe('published');
      await expect(command.func(args)).resolves.toEqual(outcome.value);
    } else {
      expect(outcome.error.message).toContain('success unconfirmed');
      await expect(command.func(args)).rejects.toThrow('unconfirmed');
    }
    expect(mocks.execFile).toHaveBeenCalledTimes(calls);
  });
  it('persists uncertainty before one submission attempt and never retries it', async () => {
    let saved;
    const click = vi.fn().mockRejectedValue(new Error('transport lost'));
    const persist = state => {saved = state;};
    await expect(submitOnce({state: {status: 'prepared'}, persist, click, confirm: vi.fn()})).rejects.toThrow('transport lost');
    expect(saved.status).toBe('submitting');
    await expect(submitOnce({state: saved, persist, click, confirm: vi.fn()})).rejects.toThrow('unconfirmed');
    expect(click).toHaveBeenCalledTimes(1);
  });
  it('blocks an uncertain receipt through the registered command before touching the browser', async () => {
    const f = fixture();
    fs.writeFileSync(f.receipt, JSON.stringify({status: 'submitting', fingerprint: f.fingerprint}));
    await expect(getRegistry().get('xiaohongshu/publish-video').func({metadata: f.metadata, timeout: 1})).rejects.toThrow('unconfirmed');
    expect(mocks.execFile).not.toHaveBeenCalled();
  });
  it('returns a confirmed receipt through the registered command without uploading again', async () => {
    const f = fixture();
    const result = {status: 'published', title: f.data.title, video: f.file, url: 'https://creator.xiaohongshu.com/publish/success'};
    fs.writeFileSync(f.receipt, JSON.stringify({status: 'published', fingerprint: f.fingerprint, result}));
    await expect(getRegistry().get('xiaohongshu/publish-video').func({metadata: f.metadata, timeout: 1})).resolves.toEqual([result]);
    expect(mocks.execFile).not.toHaveBeenCalled();
    fs.writeFileSync(f.metadata, JSON.stringify({...f.data, title: '另一个标题'}));
    await expect(getRegistry().get('xiaohongshu/publish-video').func({metadata: f.metadata, timeout: 1})).rejects.toThrow('changed after publication');
  });
  it('checks the actual prepared form and cover through the registered command', async () => {
    const f = fixture();
    const data = {...f.data, cover_url: 'https://example.com/custom.png'};
    fs.writeFileSync(f.metadata, JSON.stringify(data));
    mocks.execFile.mockImplementation((binary, argv, options, callback) => {
      const action = argv[2], script = argv[3] || '';
      let result = {};
      if (action === 'eval') {
        if (script.includes('coverReady')) result = {editorTitle: data.title, editorBody: data.content, coverUrl: 'https://example.com/default.png', coverReady: true};
        else if (script.includes('Boolean(document.querySelector')) result = true;
        else result = {url: 'https://creator.xiaohongshu.com/publish/publish?target=video', text: 'tester\ndemo.mp4', disabled: 'false'};
      }
      callback(null, JSON.stringify(result), '');
    });
    await expect(getRegistry().get('xiaohongshu/publish-video').func({metadata: f.metadata, timeout: 1, session: 'test', resume: true, execute: true})).rejects.toThrow('Saved cover');
    expect(fs.existsSync(f.receipt)).toBe(false);
    expect(mocks.execFile.mock.calls.some(call => call[1][3]?.includes('h._onPublish()'))).toBe(false);
  });
  it('locks both the metadata and the named browser session before concurrent preparation', async () => {
    const first = fixture(), second = fixture();
    let pendingCallback;
    mocks.execFile.mockImplementation((binary, argv, options, callback) => {pendingCallback = callback;});
    const command = getRegistry().get('xiaohongshu/publish-video');
    const args = {metadata: first.metadata, timeout: 1, session: 'concurrent-test', resume: true};
    const pending = command.func(args);
    const rejected = expect(pending).rejects.toThrow('Wrong page');
    await expect(command.func(args)).rejects.toThrow('Cannot lock');
    await expect(command.func({...args, metadata: second.metadata})).rejects.toThrow('Cannot lock');
    expect(mocks.execFile).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(second.receipt + '.lock')).toBe(false);
    pendingCallback(null, JSON.stringify({url: 'about:blank', text: ''}), '');
    await rejected;
    expect(fs.existsSync(first.receipt + '.lock')).toBe(false);
  });
});
