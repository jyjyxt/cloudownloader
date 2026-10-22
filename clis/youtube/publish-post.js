// Strategy: UI_SELECTOR / DOM_STATE; contract: visible-ui.
// Verified 2026-10-22: owner Posts page, Image attachment, native file input,
// visible caption editor, Public visibility and the published post permalink.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, writeFileSync, renameSync, statSync, existsSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { cli, Strategy } from '@jyjyxt/cloudl/registry';
import { ArgumentError, AuthRequiredError, CommandExecutionError, TimeoutError } from '@jyjyxt/cloudl/errors';
import { fillPublishField } from '../_shared/publish-form.js';

const run = promisify(execFile);
const sha = value => createHash('sha256').update(value).digest('hex');

export function validatePost(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      Object.keys(data).some(key => !['channel', 'account', 'content', 'image'].includes(key)) ||
      !/^UC[\w-]{22}$/.test(data.channel || '') ||
      typeof data.account !== 'string' || !data.account.trim() ||
      typeof data.content !== 'string' || !data.content.trim() || data.content.length > 10000 ||
      typeof data.image !== 'string' || !data.image.trim())
    throw new ArgumentError('Require JSON fields channel (UC channel ID), account (channel display name), content (1–10000 characters) and image; no other fields are accepted');
  return data;
}

// Browser-side reader: return hashes and dimensions, never base64 or cookies.
export async function readPostPage() {
  const composer = document.querySelector('ytd-backstage-post-dialog-renderer');
  const thumbnails = [...document.querySelectorAll('ytd-backstage-multi-image-thumbnail-renderer img')]
    .filter(image => image.getClientRects().length && image.naturalWidth > 0);
  const attachments = [];
  for (const image of thumbnails) {
    let checksum = null;
    if (/^data:image\/[^;,]+;base64,/.test(image.src)) {
      const bytes = Uint8Array.from(atob(image.src.split(',')[1]), value => value.charCodeAt(0));
      checksum = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
        .map(value => value.toString(16).padStart(2, '0')).join('');
    }
    attachments.push({ checksum, width: image.naturalWidth, height: image.naturalHeight, ready: image.complete });
  }
  return {
    pageUrl: location.href,
    signedIn: window.ytcfg?.get('LOGGED_IN'),
    ownerLinks: [...document.querySelectorAll('a[href^="https://studio.youtube.com/channel/"]')].map(link => link.href),
    composerAccount: composer?.querySelector('#header-channel-name')?.textContent.trim(),
    visibilityLabel: composer?.querySelector('#header-default-visibility')?.textContent.trim(),
    captionValue: document.querySelector('#contenteditable-root')?.innerText,
    editorVisible: !!document.querySelector('#contenteditable-root')?.getClientRects().length,
    canSubmit: [...document.querySelectorAll('#submit-button button[aria-label="Post"]')]
      .some(button => button.getClientRects().length && !button.disabled),
    attachments,
    publishedCards: [...document.querySelectorAll('ytd-backstage-post-renderer')].map(card => ({
      identifier: card.data?.postId,
      caption: card.querySelector('#content-text')?.innerText,
      author: card.querySelector('#author-text')?.innerText.trim(),
      hasImage: !!card.querySelector('ytd-backstage-image-renderer'),
    })),
  };
}

export function assertOwner(actual, data) {
  if (actual.signedIn === false) throw new AuthRequiredError('www.youtube.com');
  if (actual.signedIn !== true || !actual.ownerLinks.some(link => link.startsWith(`https://studio.youtube.com/channel/${data.channel}/`)) ||
      actual.composerAccount !== data.account || new URL(actual.pageUrl).pathname !== `/channel/${data.channel}/posts`)
    throw new CommandExecutionError('Posts page does not belong to the requested signed-in channel');
}

export function assertPrepared(actual, data, imageHash) {
  assertOwner(actual, data);
  if (actual.visibilityLabel !== 'Public' || actual.captionValue !== data.content || !actual.editorVisible || !actual.canSubmit ||
      actual.attachments.length !== 1 || !actual.attachments[0].ready || actual.attachments[0].checksum !== imageHash)
    throw new CommandExecutionError('Public post form or image bytes do not match metadata; inspect the editor before submission');
}

// Use the observed visible control's normal DOM click event. Do not invoke
// Polymer handlers or change hidden/disabled attributes to open the editor.
export function clickPostControl(selector) {
  const controls = [...document.querySelectorAll(selector)].filter(element => element.getClientRects().length && !element.disabled);
  if (controls.length !== 1) return { clicked: false, visibleMatches: controls.length };
  controls[0].click();
  return { clicked: true };
}

cli({
  site: 'youtube', name: 'publish-post', access: 'write', browser: false, strategy: Strategy.UI,
  description: 'Prepare a public image post; --execute submits once with a durable receipt',
  args: [
    { name: 'metadata', positional: true, required: true, help: 'JSON: channel, account, content, image (one local image)' },
    { name: 'session', default: 'youtube-post', help: 'Named Cloudl browser session' },
    { name: 'resume', type: 'bool', default: false, help: 'Inspect the prepared editor without navigating or re-uploading' },
    { name: 'execute', type: 'bool', default: false, help: 'Submit once; never retry an uncertain submission' },
  ],
  columns: ['status', 'account', 'image', 'url'],
  func: async args => {
    const metadata = resolve(args.metadata);
    let data;
    try { data = validatePost(JSON.parse(readFileSync(metadata, 'utf8'))); }
    catch (error) {
      if (error instanceof ArgumentError) throw error;
      throw new ArgumentError(`Cannot read post metadata: ${error.message}`);
    }
    const image = resolve(dirname(metadata), data.image);
    let info;
    try { info = statSync(image); }
    catch (error) { throw new ArgumentError(`Cannot read image: ${error.message}`); }
    if (!info.isFile() || info.size < 1 || info.size > 16 * 1024 * 1024 || !['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extname(image).toLowerCase()))
      throw new ArgumentError('Use a nonempty JPG, PNG, GIF or WebP image up to 16 MiB');
    const session = args.session || 'youtube-post';
    if (!/^[\w-]{1,80}$/.test(session)) throw new ArgumentError('Use a browser session name of 1–80 letters, digits, underscores or hyphens');
    const imageHash = sha(readFileSync(image));
    const fingerprint = sha(JSON.stringify({ data, imageHash, session }));
    const statePath = metadata + '.state.json';
    const locks = [statePath + '.lock', join(tmpdir(), `cloudl-youtube-post-${sha(session)}.lock`)];
    const acquired = [];
    try {
      for (const lock of locks) {
        try { closeSync(openSync(lock, 'wx', 0o600)); acquired.push(lock); }
        catch (error) { throw new CommandExecutionError(`Publisher lock unavailable (${error.code}); check for another publisher before removing a stale lock`); }
      }
      let saved;
      if (existsSync(statePath)) {
        try { saved = JSON.parse(readFileSync(statePath, 'utf8')); }
        catch (error) { throw new CommandExecutionError(`Cannot read publication receipt: ${error.message}`); }
        if (saved.fingerprint !== fingerprint) throw new CommandExecutionError('Metadata, image or session changed; retain the original receipt and use a new metadata file');
        if (saved.status === 'published') return [saved.result];
        if (saved.status !== 'prepared') throw new CommandExecutionError('Previous submission is unconfirmed; inspect the channel before any manual reconciliation. Do not retry');
      }
      if (args.resume && !saved) throw new ArgumentError('--resume requires a prepared publication receipt');
      const persist = value => {
        writeFileSync(statePath + '.tmp', JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
        renameSync(statePath + '.tmp', statePath);
      };
      async function browser(...parts) {
        try {
          const result = await run('cloudl', ['browser', session, ...parts], { timeout: 60000, maxBuffer: 2000000 });
          return JSON.parse(result.stdout);
        } catch (error) { throw new CommandExecutionError(`Cloudl browser failed: ${error.stderr || error.stdout || error.message}`); }
      }
      const snapshot = () => browser('eval', `(${readPostPage.toString()})()`);
      const click = async selector => {
        const feedback = await browser('eval', `(${clickPostControl.toString()})(${JSON.stringify(selector)})`);
        if (!feedback?.clicked) throw new CommandExecutionError(`Expected one visible enabled post control: ${selector}`);
      };
      if (!args.resume) await browser('open', `https://www.youtube.com/channel/${data.channel}/posts?show_create_dialog=1`);
      let actual = await snapshot();
      assertOwner(actual, data);
      const before = new Set(actual.publishedCards.map(card => card.identifier));
      if (!args.resume) {
        await click('#commentbox-placeholder');
        await click('ytd-commentbox #image-button button');
        await browser('upload', 'ytd-backstage-multi-image-select-renderer input[type=file][multiple]', image);
        await fillPublishField(browser, '#contenteditable-root', data.content);
      }
      for (let attempt = 0; attempt < 20; attempt += 1) {
        actual = await snapshot();
        if (actual.attachments.length === 1 && actual.attachments[0].ready && actual.canSubmit) break;
        if (attempt === 19) throw new TimeoutError('YouTube image post readiness', 20);
        await new Promise(done => setTimeout(done, 1000));
      }
      assertPrepared(actual, data, imageHash);
      const pending = { status: 'prepared', fingerprint };
      persist(pending);
      if (!args.execute) return [{ status: 'prepared', account: data.account, image, url: actual.pageUrl }];
      persist({ ...pending, status: 'submitting', submitted_at: new Date().toISOString() });
      await click('#submit-button button[aria-label="Post"]');
      let identifier;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        actual = await snapshot();
        const card = actual.publishedCards.find(post => /^Ug[\w-]+$/.test(post.identifier || '') && !before.has(post.identifier) &&
          post.caption === data.content && post.author === data.account && post.hasImage);
        if (card) { identifier = card.identifier; break; }
        await new Promise(done => setTimeout(done, 1000));
      }
      if (!identifier) throw new CommandExecutionError('Post was submitted once but no matching new permalink was confirmed; inspect the channel and retain the submitting receipt');
      const url = `https://www.youtube.com/post/${identifier}`;
      await browser('open', url);
      actual = await snapshot();
      if (!actual.publishedCards.some(post => post.identifier === identifier && post.caption === data.content && post.author === data.account && post.hasImage))
        throw new CommandExecutionError('Submitted post permalink did not verify; inspect the channel and retain the submitting receipt');
      const result = { status: 'published', account: data.account, image, url };
      persist({ ...pending, status: 'published', result });
      return [result];
    } finally {
      for (const lock of acquired.reverse()) unlinkSync(lock);
    }
  },
});
