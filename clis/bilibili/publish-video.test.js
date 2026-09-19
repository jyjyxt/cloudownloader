import { describe, expect, it, vi } from 'vitest';
import { getRegistry } from '@jyjyxt/cloudl/registry';
import { validateMetadata, submitOnce, submissionResult } from './publish-video.js';
const valid = () => ({ video: '/tmp/video.mp4', account: 'test', title: 'AI使用方法', description: '访谈内容整理', category: '人工智能', declaration: '内容无需标注', tags: ['AI', '效率提升'] });
describe('bilibili publish-video', () => {
  it('recognizes the first-upload acknowledgement without requiring a BV link', () => {
    expect(submissionResult({ text: '恭喜你上传第一个稿件，成为UP主~', url: 'https://member.bilibili.com/platform/upload/video/frame' }, 'test')).toEqual({
      status: 'submitted', title: 'test', bvid: '', url: 'https://member.bilibili.com/platform/upload/video/frame'
    });
  });
  it('extracts the video link from a normal submission acknowledgement', () => {
    expect(submissionResult({ text: '投稿成功', links: ['https://www.bilibili.com/video/BV1zAeh63Evp/'] }, 'test')).toEqual({
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
    { declaration: '' }, { declaration: '内容为转载' }, { cover_index: -1 }
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
