import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getRegistry } from '@jyjyxt/cloudl/registry';
import { JSDOM } from 'jsdom';
const mocks = vi.hoisted(() => ({execFile: vi.fn()}));
vi.mock('node:child_process', () => {
  mocks.execFile[Symbol.for('nodejs.util.promisify.custom')] = (...args) => new Promise((resolve, reject) => {
    mocks.execFile(...args, (error, stdout, stderr) => error ? reject(error) : resolve({stdout, stderr}));
  });
  return {execFile: mocks.execFile};
});
import { validateMetadata, submitOnce, submissionResult, assertCover, readAcknowledgement } from './publish-video.js';
const valid = () => ({ video: '/tmp/video.mp4', account: 'test', title: 'AI使用方法', description: '访谈内容整理', category: '人工智能', declaration: '内容无需标注', tags: ['AI', '效率提升'] });
const roots = [];
afterEach(() => {
  vi.useRealTimers();
  mocks.execFile.mockReset();
  for (const root of roots.splice(0)) fs.rmSync(root, {recursive: true, force: true});
});
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudl-bili-video-'));
  roots.push(root);
  const video = path.join(root, 'video.mp4');
  fs.writeFileSync(video, 'test video');
  const data = {...valid(), video, description: '本期演示如何排查稿件投递成功后的审核问题'};
  const metadata = path.join(root, 'metadata.json');
  fs.writeFileSync(metadata, JSON.stringify(data));
  return {root, video, data, metadata, receipt: metadata + '.state.json'};
}
describe('bilibili publish-video', () => {
  it('does not turn success words in metadata into a confirmed receipt through the registered command', async () => {
    vi.useFakeTimers();
    const f = fixture();
    mocks.execFile.mockImplementation((binary, argv, options, callback) => {
      const action = argv[2], script = argv[3] || '';
      let result = {};
      if (action === 'eval') {
        if (script.includes('fetch(\'https://api.bilibili.com')) result = {code: 0, login: true, name: f.data.account, id: ''};
        else if (script.includes('readAcknowledgement')) result = {
          pageUrl: 'https://member.bilibili.com/platform/upload/video/frame', editorTitle: f.data.title,
          text: f.data.description + '\n上传完成', description: f.data.description, declaration: f.data.declaration,
          category: f.data.category, tags: f.data.tags, files: [{name: 'video.mp4', size: fs.statSync(f.video).size}],
          cover: true, coverUrl: 'https://example.com/frame.jpg', feedback: '', submit: true, progress: '上传完成'
        };
        else result = !script.includes(".tag-pre-wrp .close");
      }
      callback(null, JSON.stringify(result), '');
    });
    const command = getRegistry().get('bilibili/publish-video');
    const args = {metadata: f.metadata, session: 'bili-feedback-test', timeout: 1, resume: true, execute: true};
    const pending = command.func(args);
    const rejected = pending.then(() => null, error => error);
    await vi.advanceTimersByTimeAsync(65000);
    expect((await rejected).message).toContain('acknowledgement unconfirmed');
    expect(JSON.parse(fs.readFileSync(f.receipt)).status).toBe('submitting');
    expect(mocks.execFile.mock.calls.filter(call => call[1][2] === 'click' && call[1][3] === '.submit-add')).toHaveLength(1);
    const calls = mocks.execFile.mock.calls.length;
    await expect(command.func(args)).rejects.toThrow('unconfirmed');
    expect(mocks.execFile).toHaveBeenCalledTimes(calls);
  });
  it('blocks concurrent metadata access before any browser operation', async () => {
    const f = fixture();
    fs.writeFileSync(f.receipt + '.lock', '');
    await expect(getRegistry().get('bilibili/publish-video').func({metadata: f.metadata, timeout: 1})).rejects.toThrow('Cannot lock');
    expect(mocks.execFile).not.toHaveBeenCalled();
  });
  it('extracts feedback from platform UI, excluding identical words in editable metadata', () => {
    const dom = new JSDOM('<div editor_id="desc_at_editor"><div contenteditable="true">稿件投递成功</div></div><div id="feedback"><svg></svg>稿件投递成功</div>', {runScripts: 'outside-only'});
    dom.window.Element.prototype.getBoundingClientRect = () => ({width: 100});
    expect(dom.window.eval(`(${readAcknowledgement.toString()})()`)).toBe('稿件投递成功');
    dom.window.document.querySelector('#feedback').remove();
    expect(dom.window.eval(`(${readAcknowledgement.toString()})()`)).toBe('');
    expect(submissionResult({text: '本期演示如何排查稿件投递成功后的审核问题', feedback: ''}, 'test')).toBeNull();
    dom.window.close();
  });
  it('recognizes the current creator-center acknowledgement as submitted, not approved', () => {
    expect(submissionResult({ feedback: '稿件投递成功', pageUrl: 'https://member.bilibili.com/platform/upload/video/frame' }, '中文标题')).toEqual({
      status: 'submitted', title: '中文标题', bvid: '', url: 'https://member.bilibili.com/platform/upload/video/frame'
    });
  });
  it('extracts the BV link from the current acknowledgement', () => {
    expect(submissionResult({ feedback: '稿件投递成功', links: ['https://www.bilibili.com/video/BV1zAeh63Evp/'] }, 'test').bvid).toBe('BV1zAeh63Evp');
  });
  it('requires the requested saved cover rather than accepting an arbitrary default frame', () => {
    expect(() => assertCover({cover: true, coverUrl: 'https://example.com/default.jpg'}, {cover_url: 'https://example.com/custom.jpg'})).toThrow('does not match');
    expect(() => assertCover({cover: false}, {})).toThrow('unavailable');
    expect(() => assertCover({cover: true, coverUrl: 'https://example.com/custom.jpg'}, {cover_url: 'https://example.com/custom.jpg'})).not.toThrow();
  });
  it('recognizes the first-upload acknowledgement without requiring a BV link', () => {
    expect(submissionResult({ feedback: '恭喜你上传第一个稿件，成为UP主~', pageUrl: 'https://member.bilibili.com/platform/upload/video/frame' }, 'test')).toEqual({
      status: 'submitted', title: 'test', bvid: '', url: 'https://member.bilibili.com/platform/upload/video/frame'
    });
  });
  it('extracts the video link from a normal submission acknowledgement', () => {
    expect(submissionResult({ feedback: '投稿成功', links: ['https://www.bilibili.com/video/BV1zAeh63Evp/'] }, 'test')).toEqual({
      status: 'submitted', title: 'test', bvid: 'BV1zAeh63Evp', url: 'https://www.bilibili.com/video/BV1zAeh63Evp'
    });
  });
  it('does not confuse upload completion with submission', () => {
    expect(submissionResult({ text: '上传完成 立即投稿' }, 'test')).toBeNull();
  });
  it('registers an explicit write command, defaulting to preparation', () => {
    const command = getRegistry().get('bilibili/publish-video');
    expect(command.access).toBe('write');
    expect(command.args.find(a=>a.name==='execute').default).toBe(false);
    expect(command.args.find(a=>a.name==='resume').default).toBe(false);
  });
  it('accepts complete metadata and explicit AI declaration when requested', () => {
    expect(validateMetadata(valid()).tags).toEqual(['AI', '效率提升']);
    expect(validateMetadata({ ...valid(), declaration: '含AI生成内容' }).declaration).toBe('含AI生成内容');
  });
  it.each([
    { account: '' }, { title: '字'.repeat(81) }, { description: '字'.repeat(2001) },
    { tags: [] }, { tags: ['AI', 'AI'] }, { tags: ['a,b'] }, { tags: ['x'.repeat(21)] },
    { declaration: '' }, { declaration: '内容为转载' }, { cover_index: -1 },
    { cover: '/tmp/cover.png' }, { cover_url: 'file:///tmp/cover.png' }, { cover_url: 123 }
  ])('rejects invalid metadata before any browser work: %j', patch => {
    expect(() => validateMetadata({ ...valid(), ...patch })).toThrow();
  });
  it('persists submitting before clicking and records the confirmed result', async () => {
    const order = [];
    const result = { status: 'submitted', bvid: 'BV1234567890' };
    await expect(submitOnce({ state: { status: 'prepared' },
      persist: s => order.push(s.status), click: async () => order.push('click'),
      confirm: async () => result })).resolves.toEqual(result);
    expect(order).toEqual(['submitting', 'click', 'submitted']);
  });
  it('does not retry a click that errors or mark it as successful', async () => {
    const persist = vi.fn(); const click = vi.fn().mockRejectedValue(new Error('transport lost'));
    const confirm = vi.fn();
    await expect(submitOnce({ state: { status: 'prepared' }, persist, click, confirm })).rejects.toThrow('transport lost');
    expect(click).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist.mock.calls[0][0].status).toBe('submitting');
    expect(confirm).not.toHaveBeenCalled();
  });
  it('blocks uncertain submissions and returns confirmed receipts without another click', async () => {
    const click = vi.fn(); const persist = vi.fn(); const confirm = vi.fn();
    await expect(submitOnce({ state: { status: 'submitting' }, persist, click, confirm })).rejects.toThrow('unconfirmed');
    const result = { status: 'submitted', bvid: 'BV1234567890' };
    await expect(submitOnce({ state: { status: 'submitted', result }, persist, click, confirm })).resolves.toEqual(result);
    expect(click).not.toHaveBeenCalled(); expect(persist).not.toHaveBeenCalled();
  });
});
