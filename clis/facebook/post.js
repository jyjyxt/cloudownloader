import * as fs from 'node:fs';
import * as path from 'node:path';
import { cli, Strategy } from '@jackwener/opencli/registry';
import {
  ArgumentError,
  AuthRequiredError,
  CommandExecutionError,
  TimeoutError,
} from '@jackwener/opencli/errors';

const FACEBOOK_HOME = 'https://www.facebook.com/';
const COMPOSER_SELECTOR = '[role="dialog"] [contenteditable="true"], [contenteditable="true"][role="textbox"]';
const UPLOAD_SELECTOR = '[data-opencli-facebook-upload-target="true"]';
const SUBMIT_TIMEOUT_SECONDS = 20;
const SUPPORTED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

function unwrapBrowserResult(value) {
  return value && typeof value === 'object' && 'data' in value ? value.data : value;
}

function requireActionResult(value, context) {
  const result = unwrapBrowserResult(value);
  if (!result || typeof result !== 'object' || Array.isArray(result) || typeof result.ok !== 'boolean') {
    throw new CommandExecutionError(`${context} returned a malformed result.`);
  }
  return result;
}

export function validatePostText(value) {
  const text = String(value ?? '');
  if (!text.trim()) {
    throw new ArgumentError('Facebook post text cannot be empty.');
  }
  return text;
}

export function validateImagePath(value) {
  const image = String(value ?? '').trim();
  if (!image) throw new ArgumentError('Facebook image path cannot be empty.');

  const resolved = path.resolve(image);
  const extension = path.extname(resolved).toLowerCase();
  if (!SUPPORTED_IMAGE_EXTENSIONS.has(extension)) {
    throw new ArgumentError(
      `Unsupported Facebook image format "${extension || '(none)'}".`,
      'Supported formats: jpg, jpeg, png, gif, webp',
    );
  }

  const stat = fs.statSync(resolved, { throwIfNoEntry: false });
  if (!stat || !stat.isFile()) throw new ArgumentError(`Facebook image file not found: ${resolved}`);
  return resolved;
}

function isUnsupportedInsertTextError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /unknown action|not supported|inserttext/i.test(message);
}

export function buildOpenComposerScript() {
  return `(() => {
    const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const path = window.location?.pathname || '';
    const bodyText = clean(document.body?.innerText || document.body?.textContent || '');
    const authRoute = /\\/(?:login(?:\\.php)?|checkpoint)(?:\\/|$)/i.test(path);
    const authWall = /log in to facebook|登录 Facebook/i.test(bodyText);
    if (authRoute || authWall) return { ok: false, reason: 'auth' };

    const hasComposer = Array.from(document.querySelectorAll('[contenteditable="true"]'))
      .some((el) => el.getAttribute('role') === 'textbox' || el.closest('[role="dialog"]'));
    if (hasComposer) return { ok: true, alreadyOpen: true };

    const labels = /what(?:'|’)s on your mind|what are you thinking|create post|post something|你在想什么|创建帖子/i;
    const candidates = Array.from(document.querySelectorAll('button, [role="button"], [aria-label]'));
    const trigger = candidates.find((node) => labels.test(clean(
      (node.getAttribute?.('aria-label') || '') + ' ' + (node.textContent || ''),
    )));
    if (!trigger) return { ok: false, reason: 'composer_trigger_missing' };
    const clickable = trigger.closest('button, [role="button"]') || trigger;
    clickable.click();
    return { ok: true, opened: true };
  })()`;
}

export function buildPrepareImageScript() {
  return `(() => {
    const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim().toLowerCase();
    const root = document.querySelector('[role="dialog"]') || document;
    const labels = /photo\\s*\\/?\\s*video|add photo|照片|视频|照片或视频/i;
    const candidates = Array.from(root.querySelectorAll('button, [role="button"], [aria-label]'));
    const button = candidates.find((node) => labels.test(clean(
      (node.getAttribute?.('aria-label') || '') + ' ' + (node.textContent || ''),
    )));
    if (!button) return { ok: false, message: 'Could not find Facebook Photo/Video control in the post composer.' };
    (button.closest('button, [role="button"]') || button).click();
    return { ok: true };
  })()`;
}

export function buildResolveUploadSelectorScript() {
  return `(() => {
    const root = document.querySelector('[role="dialog"]') || document;
    const input = root.querySelector('input[type="file"]') || document.querySelector('input[type="file"]');
    if (!input) return { ok: false, message: 'Facebook image upload input did not appear.' };
    input.setAttribute('data-opencli-facebook-upload-target', 'true');
    return { ok: true, selector: '${UPLOAD_SELECTOR}' };
  })()`;
}

export function buildImagePreviewScript() {
  return `(async () => {
    const root = () => document.querySelector('[role="dialog"]') || document;
    const visible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    };
    for (let i = 0; i < 60; i += 1) {
      const scope = root();
      const inputReady = Array.from(scope.querySelectorAll('input[type="file"]'))
        .some((input) => input.files && input.files.length > 0);
      const preview = Array.from(scope.querySelectorAll('img, video, [aria-label], [role="button"]'))
        .some((el) => visible(el) && /remove (photo|image|media)|删除|移除/i.test(
          (el.getAttribute?.('aria-label') || '') + ' ' + (el.textContent || ''),
        ));
      if (inputReady || preview) return { ok: true };
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return { ok: false, message: 'Facebook image preview did not appear after upload.' };
  })()`;
}

function composerTextScript() {
  return `(() => {
    const root = document.querySelector('[role="dialog"]') || document;
    const boxes = Array.from(root.querySelectorAll('[contenteditable="true"]'));
    const box = boxes.find((el) => el.getAttribute('role') === 'textbox') || boxes[0];
    if (!box) return { ok: false, message: 'Could not find the Facebook post editor. Are you logged in?' };
    box.focus();
    return { ok: true };
  })()`;
}

export function buildVerifyComposerTextScript(text) {
  return `(async () => {
    const expected = ${JSON.stringify(text)};
    const normalize = (value) => String(value || '').replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ').trim();
    const wanted = normalize(expected);
    for (let i = 0; i < 40; i += 1) {
      const root = document.querySelector('[role="dialog"]') || document;
      const box = root.querySelector('[contenteditable="true"]');
      const actual = box ? (box.innerText || box.textContent || '') : '';
      if (box && normalize(actual).includes(wanted)) return { ok: true };
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return { ok: false, message: 'Could not verify Facebook post text in the editor.' };
  })()`;
}

export function buildDomInsertTextScript(text) {
  return `(async () => {
    try {
      const root = document.querySelector('[role="dialog"]') || document;
      const box = root.querySelector('[contenteditable="true"]');
      if (!box) return { ok: false, message: 'Could not find the Facebook post editor.' };
      box.focus();
      const value = ${JSON.stringify(text)};
      if (!document.execCommand('insertText', false, value)) {
        const data = new DataTransfer();
        data.setData('text/plain', value);
        box.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, message: String(error) };
    }
  })()`;
}

export function buildSubmitClickScript(text) {
  return `(() => {
    const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const wanted = clean(${JSON.stringify(text)});
    const dialog = document.querySelector('[role="dialog"]');
    const root = dialog || document;
    const visible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.getAttribute('aria-hidden') !== 'true';
    };
    const mark = (selector, attribute) => Array.from(document.querySelectorAll(selector)).forEach((el) => {
      if (visible(el) && clean(el.textContent || '').includes(wanted)) el.setAttribute(attribute, 'true');
    });
    Array.from(document.querySelectorAll('[role="alert"], [data-testid="toast"]')).forEach((el) => {
      if (visible(el)) el.setAttribute('data-opencli-facebook-before-submit-toast', 'true');
    });
    mark('[dir="auto"], [role="article"]', 'data-opencli-facebook-before-submit-match');

    const submitLabels = /^(?:post|publish|share now|发布|发表|分享)$/i;
    const buttons = Array.from(root.querySelectorAll('button, [role="button"]'));
    const button = buttons.find((el) => {
      const label = clean((el.getAttribute?.('aria-label') || '') + ' ' + (el.textContent || ''));
      return visible(el) && submitLabels.test(label) && !el.disabled && el.getAttribute('aria-disabled') !== 'true';
    });
    if (!button) return { ok: false, message: 'Facebook Post button is disabled or could not be found.' };
    button.click();
    return { ok: true };
  })()`;
}

export function buildSubmitStatusScript(text) {
  return `(async () => {
    const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const wanted = clean(${JSON.stringify(text)});
    const visible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.getAttribute('aria-hidden') !== 'true';
    };
    const success = /post(?:ed| published)|published successfully|your post is now live|shared successfully|已发布|发表成功|分享成功/i;
    const failure = /something went wrong|could not post|failed to post|try again|出错|失败|无法发布/i;
    for (let i = 0; i < 40; i += 1) {
      const alerts = Array.from(document.querySelectorAll('[role="alert"], [data-testid="toast"]')).filter(visible);
      const freshAlert = alerts.find((el) => !el.hasAttribute('data-opencli-facebook-before-submit-toast'));
      if (freshAlert && success.test(freshAlert.textContent || '')) {
        return { ok: true, verification: 'success_toast', message: clean(freshAlert.textContent) };
      }
      if (freshAlert && failure.test(freshAlert.textContent || '')) {
        return { ok: false, message: clean(freshAlert.textContent) || 'Facebook rejected the post.' };
      }

      const freshMatch = Array.from(document.querySelectorAll('[dir="auto"], [role="article"]'))
        .some((el) => visible(el) && !el.hasAttribute('data-opencli-facebook-before-submit-match')
          && clean(el.textContent || '').includes(wanted));
      if (freshMatch) return { ok: true, verification: 'feed_match', message: 'Facebook post appeared in the feed.' };

      const dialog = document.querySelector('[role="dialog"]');
      const editorOpen = !!dialog && !!dialog.querySelector('[contenteditable="true"]');
      if (!editorOpen && i >= 2) {
        return { ok: true, verification: 'composer_closed', message: 'Facebook composer closed after publishing.' };
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return { ok: false, unconfirmed: true, message: 'Facebook post submission was not confirmed before timeout.' };
  })()`;
}

async function insertPostText(page, text) {
  const focus = requireActionResult(await page.evaluate(composerTextScript()), 'Facebook composer focus');
  if (!focus.ok) return focus;

  const inserters = [page.nativeType?.bind(page), page.insertText?.bind(page)].filter(Boolean);
  for (const insert of inserters) {
    try {
      await insert(text);
      const verified = requireActionResult(
        await page.evaluate(buildVerifyComposerTextScript(text)),
        'Facebook composer text verification',
      );
      if (verified.ok) return verified;
    } catch (error) {
      if (!isUnsupportedInsertTextError(error)) throw error;
    }
  }

  const fallback = requireActionResult(
    await page.evaluate(buildDomInsertTextScript(text)),
    'Facebook composer DOM insertion',
  );
  if (!fallback.ok) return fallback;
  return requireActionResult(
    await page.evaluate(buildVerifyComposerTextScript(text)),
    'Facebook composer text verification',
  );
}

async function uploadImage(page, imagePath) {
  const prepare = requireActionResult(await page.evaluate(buildPrepareImageScript()), 'Facebook image control');
  if (!prepare.ok) throw new CommandExecutionError(prepare.message || 'Could not open Facebook image upload.');

  await page.wait({ selector: 'input[type="file"]', timeout: 15 });
  const selector = requireActionResult(
    await page.evaluate(buildResolveUploadSelectorScript()),
    'Facebook image input lookup',
  );
  if (!selector.ok) throw new CommandExecutionError(selector.message || 'Facebook image input was not found.');

  if (typeof page.setFileInput === 'function') {
    await page.setFileInput([imagePath], selector.selector);
  } else {
    const extension = path.extname(imagePath).toLowerCase();
    const mime = extension === '.png' ? 'image/png' : extension === '.gif' ? 'image/gif' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
    const base64 = fs.readFileSync(imagePath).toString('base64');
    const result = requireActionResult(await page.evaluate(`(() => {
      const input = document.querySelector(${JSON.stringify(selector.selector)});
      if (!input) return { ok: false, message: 'Facebook image upload input disappeared.' };
      const file = ${JSON.stringify({ name: path.basename(imagePath), mime, base64 })};
      const binary = atob(file.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const data = new DataTransfer();
      data.items.add(new File([bytes], file.name, { type: file.mime }));
      try { Object.defineProperty(input, 'files', { value: data.files, configurable: true }); } catch {}
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: !!input.files?.length };
    })()`), 'Facebook image upload fallback');
    if (!result.ok) throw new CommandExecutionError('Facebook image upload failed.');
  }

  const preview = requireActionResult(await page.evaluate(buildImagePreviewScript()), 'Facebook image preview');
  if (!preview.ok) throw new TimeoutError('facebook image upload', 30, 'Nothing was posted. Retry with a smaller image.');
}

export const command = {
  site: 'facebook',
  name: 'post',
  access: 'write',
  description: 'Publish a Facebook post with optional image',
  domain: 'www.facebook.com',
  strategy: Strategy.UI,
  browser: true,
  navigateBefore: false,
  siteSession: 'persistent',
  defaultWindowMode: 'foreground',
  args: [
    { name: 'text', type: 'string', required: true, positional: true, help: 'Post text content' },
    { name: 'image', type: 'string', required: false, help: 'Optional local image path (jpg/png/gif/webp)' },
  ],
  columns: ['status', 'message', 'text', 'image', 'verification'],
  func: async (page, kwargs) => {
    if (!page) throw new CommandExecutionError('Browser session required for facebook post');
    const text = validatePostText(kwargs.text);
    const imagePath = kwargs.image ? validateImagePath(kwargs.image) : null;

    await page.goto(FACEBOOK_HOME, { waitUntil: 'load', settleMs: 3000 });
    const opened = requireActionResult(await page.evaluate(buildOpenComposerScript()), 'Facebook composer opening');
    if (!opened.ok) {
      if (opened.reason === 'auth') {
        throw new AuthRequiredError('www.facebook.com', 'Open Chrome and log in to Facebook before posting.');
      }
      throw new CommandExecutionError(
        opened.message || 'Could not open the Facebook post composer.',
        'Make sure Facebook is logged in and the home feed is available.',
      );
    }

    await page.wait({ selector: COMPOSER_SELECTOR, timeout: 15 });
    if (imagePath) await uploadImage(page, imagePath);

    const typed = await insertPostText(page, text);
    if (!typed?.ok) {
      throw new CommandExecutionError(
        typed?.message || 'Could not type Facebook post text.',
        'Open the Facebook composer in Chrome and check whether the account is logged in.',
      );
    }

    const clicked = requireActionResult(
      await page.evaluate(buildSubmitClickScript(text)),
      'Facebook post click',
    );
    if (!clicked.ok) throw new CommandExecutionError(clicked.message || 'Facebook Post button was not available.');

    const submitted = requireActionResult(
      await page.evaluate(buildSubmitStatusScript(text)),
      'Facebook post completion',
    );
    if (submitted.unconfirmed) {
      throw new TimeoutError(
        'facebook post',
        SUBMIT_TIMEOUT_SECONDS,
        `${submitted.message} Check the feed before retrying; the post may already be live.`,
      );
    }
    if (!submitted.ok) throw new CommandExecutionError(submitted.message || 'Facebook post failed.');

    return [{
      status: 'success',
      message: submitted.message || 'Facebook post published successfully.',
      text,
      image: imagePath ? path.basename(imagePath) : '',
      verification: submitted.verification || 'confirmed',
    }];
  },
};

cli(command);

export const __test__ = {
  buildOpenComposerScript,
  buildPrepareImageScript,
  buildResolveUploadSelectorScript,
  buildImagePreviewScript,
  buildVerifyComposerTextScript,
  buildDomInsertTextScript,
  buildSubmitClickScript,
  buildSubmitStatusScript,
  validateImagePath,
  validatePostText,
};
