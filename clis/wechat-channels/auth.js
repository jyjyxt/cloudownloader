import { AuthRequiredError, CommandExecutionError } from '@jyjyxt/cloudl/errors';
import { registerSiteAuthCommands } from '../_shared/site-auth.js';

async function hasWechatChannelsSessionCookie(page) {
  const cookies = await page.getCookies({ url: 'https://channels.weixin.qq.com' });
  return cookies.some(c => c.name === 'sessionid' && c.value);
}

export function readWechatChannelsIdentity() {
  if (location.hostname !== 'channels.weixin.qq.com') return null;
  if (/login\.html/.test(location.pathname)) return { kind: 'auth', detail: 'WeChat Channels platform redirected to login.html' };
  if (!location.pathname.startsWith('/platform')) return null;
  const name = document.querySelector('.finder-nickname')?.innerText?.trim();
  const userId = document.querySelector('#finder-uid-copy')?.innerText?.trim();
  // Both belong to the rendered account header, not user-written content.
  return name && userId ? { ok: true, user_id: userId, name } : null;
}

export async function verifyWechatChannelsIdentity(page) {
  if (!await hasWechatChannelsSessionCookie(page)) {
    throw new AuthRequiredError('channels.weixin.qq.com', 'WeChat Channels sessionid cookie missing');
  }
  await page.goto('https://channels.weixin.qq.com/platform');
  await page.wait(2);
  const renderedIdentity = () => page.evaluate(`(${readWechatChannelsIdentity.toString()})()`);
  const rendered = await renderedIdentity();
  if (rendered?.kind === 'auth') throw new AuthRequiredError('channels.weixin.qq.com', rendered.detail);
  if (rendered?.ok) return { user_id: rendered.user_id, name: rendered.name };
  const probe = await page.evaluate(`(async () => {
    try {
      if (/login\\.html/.test(location.href)) {
        return { kind: 'auth', detail: 'WeChat Channels platform redirected to login.html' };
      }
      const r = await fetch('/cgi-bin/mmfinderassistant-bin/auth/auth_data', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) return { kind: 'http', httpStatus: r.status };
      const d = await r.json();
      if (typeof d?.base_resp?.ret !== 'number') return { kind: 'shape', detail: 'auth_data response schema changed (base_resp.ret missing)' };
      if (d.base_resp.ret !== 0) {
        return { kind: 'auth', detail: 'WeChat Channels auth_data base_resp.ret=' + String(d?.base_resp?.ret) };
      }
      const fu = d.data?.finder_user || d.finder_user || {};
      const userId = String(fu.uniq_id || fu.username || '');
      const name = String(fu.nickname || fu.name || '');
      if (!userId && !name) {
        return { kind: 'shape', detail: 'WeChat Channels auth_data 200 but finder_user empty' };
      }
      return { ok: true, user_id: userId, name };
    } catch (e) {
      return { kind: 'exception', detail: String(e && e.message || e) };
    }
  })()`);
  if (probe?.kind === 'auth') throw new AuthRequiredError('channels.weixin.qq.com', probe.detail);
  if (!probe?.ok) {
    // The homepage can finish loading while the legacy endpoint is unavailable.
    for (let attempt = 0; attempt < 5; attempt++) {
      await page.wait(1);
      const current = await renderedIdentity();
      if (current?.kind === 'auth') throw new AuthRequiredError('channels.weixin.qq.com', current.detail);
      if (current?.ok) return { user_id: current.user_id, name: current.name };
    }
  }
  if (probe?.kind === 'http') throw new CommandExecutionError(`HTTP ${probe.httpStatus} from auth_data`);
  if (probe?.kind === 'exception') throw new CommandExecutionError(`WeChat Channels whoami failed: ${probe.detail}`);
  if (probe?.kind === 'shape') throw new CommandExecutionError(`WeChat Channels identity could not be verified: ${probe.detail}; account header has not loaded`);
  if (!probe?.ok) throw new CommandExecutionError(`Unexpected WeChat Channels probe: ${JSON.stringify(probe)}`);
  return { user_id: probe.user_id, name: probe.name };
}

registerSiteAuthCommands({
  site: 'wechat-channels',
  domain: 'channels.weixin.qq.com',
  loginUrl: 'https://channels.weixin.qq.com/login.html?from=assistant',
  columns: ['user_id', 'name'],
  quickCheck: hasWechatChannelsSessionCookie,
  verify: verifyWechatChannelsIdentity,
  poll: async (page) => {
    if (!await hasWechatChannelsSessionCookie(page)) {
      throw new AuthRequiredError('channels.weixin.qq.com', 'Waiting for WeChat Channels sessionid cookie');
    }
    return verifyWechatChannelsIdentity(page);
  },
});
