import { AuthRequiredError, CommandExecutionError, TimeoutError } from '@jyjyxt/cloudl/errors';
import { registerSiteAuthCommands } from '../_shared/site-auth.js';

// Strategy: DOM_STATE; contract: visible-ui.
// Verified 2026-10-22: signed-in YouTube can expose LOGGED_IN=true and the
// account menu while the browser cookie probe returns no matching cookies.
export function readYoutubeIdentity() {
  const cfg = window.ytcfg;
  const flag = typeof cfg?.get === 'function' ? cfg.get('LOGGED_IN') : undefined;
  if (flag === false || location.hostname === 'accounts.google.com') {
    return { kind: 'auth', detail: 'YouTube reports that the current browser is signed out' };
  }
  if (flag !== true) return { kind: 'pending' };
  let name = '';
  const context = cfg.get('INNERTUBE_CONTEXT');
  if (context?.user?.identityName) name = String(context.user.identityName);
  const menu = document.querySelector('ytd-multi-page-menu-renderer');
  const accountName = menu?.querySelector('#account-name');
  if (!name && accountName) name = accountName.textContent.trim();
  return { kind: 'ok', identityLabel: name || null };
}

async function quickCheck(page) {
  const probe = await page.evaluate(`(${readYoutubeIdentity.toString()})()`);
  return probe?.kind === 'ok';
}

async function verifyYoutubeIdentity(page) {
  await page.goto('https://www.youtube.com/');
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const probe = await page.evaluate(`(${readYoutubeIdentity.toString()})()`);
    if (probe?.kind === 'auth') throw new AuthRequiredError('www.youtube.com', probe.detail);
    if (probe?.kind === 'ok') return { name: probe.identityLabel };
    if (probe?.kind !== 'pending')
      throw new CommandExecutionError('Unexpected YouTube identity response');
    await page.wait(0.5);
  }
  throw new TimeoutError('YouTube signed-in page state', 10);
}

registerSiteAuthCommands({
  site: 'youtube',
  domain: 'www.youtube.com',
  loginUrl: 'https://accounts.google.com/ServiceLogin?service=youtube&continue=https%3A%2F%2Fwww.youtube.com%2F',
  columns: ['name'],
  quickCheck,
  verify: verifyYoutubeIdentity,
  poll: verifyYoutubeIdentity,
});
