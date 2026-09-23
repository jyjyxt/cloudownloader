import { describe, it, expect, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { readWechatChannelsIdentity, verifyWechatChannelsIdentity } from './auth.js';

function page(...results) {
  const evaluate = vi.fn();
  for (const result of results) evaluate.mockResolvedValueOnce(result);
  return { getCookies: vi.fn().mockResolvedValue([{ name: 'sessionid', value: 'test-only' }]),
    goto: vi.fn(), wait: vi.fn(), evaluate };
}

describe('WeChat Channels account verification', () => {
  it('reads the rendered account header without requiring the old auth endpoint', async () => {
    const p = page({ ok: true, user_id: 'sph-test', name: 'tester' });
    await expect(verifyWechatChannelsIdentity(p)).resolves.toEqual({ user_id: 'sph-test', name: 'tester' });
    expect(p.evaluate).toHaveBeenCalledTimes(1);
  });
  it('can recover from a changed endpoint using a header that finishes loading later', async () => {
    const p = page(null, { kind: 'shape', detail: 'base_resp.ret missing' }, null,
      { ok: true, user_id: 'sph-test', name: 'tester' });
    await expect(verifyWechatChannelsIdentity(p)).resolves.toEqual({ user_id: 'sph-test', name: 'tester' });
  });
  it('does not misreport missing response fields as logged out', async () => {
    const p = page(null, { kind: 'shape', detail: 'base_resp.ret missing' });
    await expect(verifyWechatChannelsIdentity(p)).rejects.toMatchObject({ code: 'COMMAND_EXEC' });
  });
  it('classifies an actual unexpected API payload as a contract failure', async () => {
    const dom = new JSDOM('<div id="app"></div>', { url: 'https://channels.weixin.qq.com/platform', runScripts: 'outside-only' });
    dom.window.AbortSignal = globalThis.AbortSignal;
    dom.window.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ unexpected: true }) });
    const p = page(); p.evaluate = async script => dom.window.eval(script);
    await expect(verifyWechatChannelsIdentity(p)).rejects.toMatchObject({ code: 'COMMAND_EXEC', message: expect.stringContaining('schema changed') });
    expect(dom.window.fetch).toHaveBeenCalledTimes(1);
    dom.window.close();
  });
  it('retains explicit login failures and requires a session cookie', async () => {
    await expect(verifyWechatChannelsIdentity(page({ kind: 'auth', detail: 'redirected' }))).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    const p = page(); p.getCookies.mockResolvedValue([]);
    await expect(verifyWechatChannelsIdentity(p)).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(p.goto).not.toHaveBeenCalled();
  });
  it('still accepts a verified legacy API identity', async () => {
    await expect(verifyWechatChannelsIdentity(page(null, { ok: true, user_id: 'id', name: 'tester' })))
      .resolves.toEqual({ user_id: 'id', name: 'tester' });
  });
  it('requires both actual header fields on the expected origin', () => {
    const dom = new JSDOM('<h2 class="finder-nickname">tester</h2><span id="finder-uid-copy">sph-test</span>',
      { url: 'https://channels.weixin.qq.com/platform', runScripts: 'outside-only' });
    Object.defineProperty(dom.window.HTMLElement.prototype, 'innerText', { get() { return this.textContent; } });
    const probe = dom.window.eval(`(${readWechatChannelsIdentity.toString()})`);
    expect(probe()).toEqual({ ok: true, user_id: 'sph-test', name: 'tester' });
    dom.window.document.querySelector('#finder-uid-copy').remove();
    expect(probe()).toBeNull();
    dom.reconfigure({ url: 'https://example.com/platform' });
    expect(probe()).toBeNull();
    dom.window.close();
  });
});
