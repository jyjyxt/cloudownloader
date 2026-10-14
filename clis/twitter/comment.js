import * as fs from 'node:fs';
import * as path from 'node:path';
import { ArgumentError, CommandExecutionError, TimeoutError } from '@jyjyxt/cloudl/errors';
import { cli, Strategy } from '@jyjyxt/cloudl/registry';
import { buildTwitterArticleScopeSource, parseTweetUrl, unwrapBrowserResult } from './shared.js';
import {
    COMPOSER_FILE_INPUT_SELECTOR,
    attachComposerImage,
    downloadRemoteImage,
    resolveImagePath,
} from './utils.js';

const COMPOSER_SELECTOR = '[data-testid="tweetTextarea_0"]';
const SUBMIT_POLL_MS = 500;
const SUBMIT_TIMEOUT_MS = 15_000;

function buildCommentTargetUrl(rawUrl) {
    return parseTweetUrl(rawUrl).url;
}

function isPromiseCollectedError(err) {
    const msg = err instanceof Error ? err.message : String(err);
    return msg.includes('Promise was collected');
}

function requireCommentActionResult(value, context) {
    const result = unwrapBrowserResult(value);
    if (!result || typeof result !== 'object' || Array.isArray(result) || typeof result.ok !== 'boolean') {
        throw new CommandExecutionError(`${context} returned a malformed result.`);
    }
    if (Object.prototype.hasOwnProperty.call(result, 'message') && result.message != null && typeof result.message !== 'string') {
        throw new CommandExecutionError(`${context} returned a malformed message.`);
    }
    if (Object.prototype.hasOwnProperty.call(result, 'url') && result.url != null && typeof result.url !== 'string') {
        throw new CommandExecutionError(`${context} returned a malformed status url.`);
    }
    return result;
}

function validateCommentStatusUrl(result) {
    if (!result.url) return;
    let url;
    try {
        url = new URL(result.url);
    } catch {
        throw new CommandExecutionError('Twitter comment completion returned a malformed status url.');
    }
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    const match = url.pathname.match(/^\/([^/]+)\/status\/(\d+)\/?$/);
    if (!['x.com', 'twitter.com', 'mobile.twitter.com'].includes(hostname) || !match) {
        throw new CommandExecutionError('Twitter comment completion returned a malformed status url.');
    }
}

async function openCommentComposer(page, rawUrl) {
    const target = parseTweetUrl(rawUrl);
    await page.goto(target.url, { waitUntil: 'load', settleMs: 2500 });
    try {
        await page.wait({ selector: COMPOSER_SELECTOR, timeout: 15 });
        return { ok: true };
    } catch {
        // Some target pages expose the editor only after their own Reply action.
        const clicked = requireCommentActionResult(await page.evaluate(`(() => {
            ${buildTwitterArticleScopeSource(target.id)}
            const visible = (el) => !!el && (el.offsetParent !== null || el.getClientRects().length > 0);
            const article = findTargetArticle();
            const btn = article?.querySelector('[data-testid="reply"]');
            if (!visible(btn) || btn.disabled || btn.getAttribute('aria-disabled') === 'true') {
                return { ok: false, message: 'Could not find an enabled Reply action on the target tweet.' };
            }
            btn.click();
            return { ok: true };
        })()`), 'Twitter target comment action');
        if (!clicked.ok) return clicked;
        await page.wait({ selector: COMPOSER_SELECTOR, timeout: 15 });
        return { ok: true };
    }
}

async function insertCommentText(page, text, targetId) {
    const prepared = requireCommentActionResult(await page.evaluate(`(() => {
        ${buildTwitterArticleScopeSource(targetId)}
        const visible = (el) => !!el && (el.offsetParent !== null || el.getClientRects().length > 0);
        const targetArticle = findTargetArticle();
        if (!visible(targetArticle)) return { ok: false, message: 'The requested tweet is not visible; no comment was submitted.' };
        document.querySelectorAll('[data-cloudl-comment-editor]').forEach(el => el.removeAttribute('data-cloudl-comment-editor'));
        const boxes = Array.from(document.querySelectorAll('[data-testid="tweetTextarea_0"]')).filter(visible);
        const box = boxes.find(el => {
            const dialog = el.closest('[role="dialog"]');
            return dialog && __twHasLinkToTarget(dialog);
        }) || boxes.find(el => el.closest('[data-testid="primaryColumn"]') === targetArticle.closest('[data-testid="primaryColumn"]') && !el.closest('[role="dialog"]'));
        if (!box) return { ok: false, message: 'Could not find the target comment editor. Are you logged in?' };
        box.setAttribute('data-cloudl-comment-editor', 'true');
        return { ok: true };
    })()`), 'Twitter comment editor selection');
    if (!prepared.ok) return prepared;
    // The shared fill primitive selects existing content and uses native input
    // when available. Preserve newlines, punctuation and URLs exactly.
    const filled = await page.fillText('[data-cloudl-comment-editor]', text);
    if (filled?.filled !== true || filled?.verified !== true) {
        return { ok: false, message: 'Could not verify the exact comment text in the editor.' };
    }
    return { ok: true };
}

async function clickCommentButton(page) {
    const iterations = Math.ceil(SUBMIT_TIMEOUT_MS / SUBMIT_POLL_MS);
    return requireCommentActionResult(await page.evaluate(`(async () => {
      let submitted = false;
      try {
          const visible = (el) => !!el && (el.offsetParent !== null || el.getClientRects().length > 0);
          for (let i = 0; i < ${JSON.stringify(iterations)}; i++) {
              const editor = document.querySelector('[data-cloudl-comment-editor]');
              const root = editor?.closest('[role="dialog"]') || editor?.closest('[data-testid="primaryColumn"]');
              const buttons = Array.from(root?.querySelectorAll('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]') || []);
              const btn = buttons.find((el) => visible(el) && !el.disabled && el.getAttribute('aria-disabled') !== 'true');
              if (btn) {
                  for (const toast of Array.from(document.querySelectorAll('[role="alert"], [data-testid="toast"]'))) {
                      if (visible(toast)) toast.setAttribute('data-cloudl-before-comment-toast', 'true');
                  }
                  submitted = true;
                  btn.click();
                  return { ok: true };
              }
              await new Promise(r => setTimeout(r, ${JSON.stringify(SUBMIT_POLL_MS)}));
          }
          return { ok: false, message: 'Comment button is disabled or not found.' };
      } catch (e) {
          return { ok: false, unconfirmed: submitted, message: e.toString() };
      }
  })()`), 'Twitter comment click');
}

async function detectCommentSent(page) {
    const result = requireCommentActionResult(await page.evaluate(`(() => {
        const visible = (el) => !!el && (el.offsetParent !== null || el.getClientRects().length > 0);
        const statusUrl = (root) => {
            if (!root || typeof root.querySelectorAll !== 'function') return undefined;
            const links = Array.from(root.querySelectorAll('a[href*="/status/"]'));
            for (const link of links) {
                const href = link.href || link.getAttribute('href') || '';
                if (!href) continue;
                try {
                    const url = new URL(href, window.location.origin);
                    const hostname = url.hostname.toLowerCase().replace(/^www\\./, '');
                    if (!['x.com', 'twitter.com', 'mobile.twitter.com'].includes(hostname)) continue;
                    if (/^\\/([^/]+)\\/status\\/(\\d+)\\/?$/.test(url.pathname)) return url.href;
                } catch {}
            }
            return undefined;
        };
        const toasts = Array.from(document.querySelectorAll('[role="alert"], [data-testid="toast"]'))
            .filter((el) => visible(el) && !el.hasAttribute('data-cloudl-before-comment-toast'));
        const successToast = toasts.find((el) => !/failed|error|try again|not sent|could not/i.test(el.textContent || '') && /your (?:post|tweet) was sent|(?:post|tweet|comment) (?:sent|posted) successfully/i.test(el.textContent || ''));
        if (!successToast) return { ok: false };
        return {
            ok: true,
            message: 'Comment posted successfully.',
            url: statusUrl(successToast)
        };
    })()`), 'Twitter comment success recovery');
    validateCommentStatusUrl(result);
    return result;
}

async function waitForCommentSent(page, text) {
    const iterations = Math.ceil(SUBMIT_TIMEOUT_MS / SUBMIT_POLL_MS);
    try {
        const result = requireCommentActionResult(await page.evaluate(`(async () => {
            const visible = (el) => !!el && (el.offsetParent !== null || el.getClientRects().length > 0);
            const statusUrl = (root) => {
                if (!root || typeof root.querySelectorAll !== 'function') return undefined;
                const links = Array.from(root.querySelectorAll('a[href*="/status/"]'));
                for (const link of links) {
                    const href = link.href || link.getAttribute('href') || '';
                    if (!href) continue;
                    try {
                        const url = new URL(href, window.location.origin);
                        const hostname = url.hostname.toLowerCase().replace(/^www\\./, '');
                        if (!['x.com', 'twitter.com', 'mobile.twitter.com'].includes(hostname)) continue;
                        if (/^\\/([^/]+)\\/status\\/(\\d+)\\/?$/.test(url.pathname)) return url.href;
                    } catch {}
                }
                return undefined;
            };
            for (let i = 0; i < ${JSON.stringify(iterations)}; i++) {
                await new Promise(r => setTimeout(r, ${JSON.stringify(SUBMIT_POLL_MS)}));
                const toasts = Array.from(document.querySelectorAll('[role="alert"], [data-testid="toast"]'))
                    .filter((el) => visible(el) && !el.hasAttribute('data-cloudl-before-comment-toast'));
                const successToast = toasts.find((el) => !/failed|error|try again|not sent|could not/i.test(el.textContent || '') && /your (?:post|tweet) was sent|(?:post|tweet|comment) (?:sent|posted) successfully/i.test(el.textContent || ''));
                if (successToast) {
                    return {
                        ok: true,
                        message: 'Comment posted successfully.',
                        url: statusUrl(successToast)
                    };
                }
                const alert = toasts.find((el) => /failed|error|try again|not sent|could not/i.test(el.textContent || ''));
                if (alert) return { ok: false, message: (alert.textContent || 'Comment failed to post.').trim() };

                // Composer disappearance or text clearing alone can happen after
                // modal rewrites or failed submits. Require a fresh success toast.
            }
            return { ok: false, unconfirmed: true, message: 'Comment submission did not complete before timeout.' };
        })()`), 'Twitter comment completion');
        validateCommentStatusUrl(result);
        return result;
    } catch (err) {
        // X may route the SPA immediately after click, making CDP collect the
        // polling promise even though the comment was submitted. If the page now
        // shows the success toast, report success instead of a false negative.
        if (isPromiseCollectedError(err)) {
            try {
                await page.wait(2);
                const recovered = await detectCommentSent(page);
                if (recovered.ok) return recovered;
            } catch {}
        }
        return { ok: false, unconfirmed: true, message: `Could not confirm comment submission: ${err.message || String(err)}` };
    }
}

async function submitComment(page, text, targetId) {
    const typed = await insertCommentText(page, text, targetId);
    if (!typed?.ok) return typed;
    let clicked;
    try {
        clicked = await clickCommentButton(page);
    } catch (err) {
        if (!isPromiseCollectedError(err)) {
            return { ok: false, unconfirmed: true, message: `Could not confirm comment submission: ${err.message || String(err)}` };
        }
    }
    if (clicked && !clicked.ok) return clicked;
    return waitForCommentSent(page, text);
}

cli({
    site: 'twitter',
    name: 'comment',
    access: 'write',
    description: 'Comment on a specific tweet with exact multiline text and links, optionally attaching an image',
    domain: 'x.com',
    strategy: Strategy.UI, // Uses the UI directly to input and click post
    browser: true,
    args: [
        { name: 'url', type: 'string', required: true, positional: true, help: 'The URL of the tweet to comment on' },
        { name: 'text', type: 'string', required: true, positional: true, help: 'The text content of your comment' },
        { name: 'image', type: 'string', help: 'Optional local image path to attach to the comment' },
        { name: 'image-url', type: 'string', help: 'Optional remote image URL to download and attach to the comment' },
    ],
    columns: ['status', 'message', 'text', 'url', 'image', 'image-url'],
    func: async (page, kwargs) => {
        if (!page)
            throw new CommandExecutionError('Browser session required for twitter comment');
        buildCommentTargetUrl(kwargs.url);
        if (typeof kwargs.text !== 'string' || !kwargs.text.trim()) {
            throw new ArgumentError('Comment text cannot be empty.');
        }
        if (kwargs.image && kwargs['image-url']) {
            throw new ArgumentError('Use either --image or --image-url, not both.');
        }
        let localImagePath;
        let cleanupDir;
        try {
            if (kwargs.image) {
                localImagePath = resolveImagePath(kwargs.image);
            } else if (kwargs['image-url']) {
                const downloaded = await downloadRemoteImage(kwargs['image-url']);
                localImagePath = downloaded.absPath;
                cleanupDir = downloaded.cleanupDir;
            }
            const composer = await openCommentComposer(page, kwargs.url);
            if (!composer?.ok) {
                throw new CommandExecutionError(composer?.message ?? 'Could not open the comment composer.', 'Open the tweet in the browser and check whether the comment box is available.');
            }
            if (localImagePath) {
                await page.wait({ selector: COMPOSER_FILE_INPUT_SELECTOR, timeout: 20 });
                await attachComposerImage(page, localImagePath);
            }
            const result = await submitComment(page, kwargs.text, parseTweetUrl(kwargs.url).id);
            if (result.unconfirmed) {
                throw new TimeoutError('twitter comment', SUBMIT_TIMEOUT_MS / 1000, `${result.message} Check the tweet before retrying; the comment may already be live.`);
            }
            if (!result.ok) {
                throw new CommandExecutionError(result.message, 'Nothing was posted. Open the tweet in the browser and retry.');
            }
            return [{
                    status: 'success',
                    message: result.message,
                    text: kwargs.text,
                    url: result.url || null,
                    image: kwargs.image || null,
                    'image-url': kwargs['image-url'] || null,
                }];
        } finally {
            if (cleanupDir) {
                fs.rmSync(cleanupDir, { recursive: true, force: true });
            }
        }
    }
});
export const __test__ = {
    buildCommentTargetUrl,
    insertCommentText,
    isPromiseCollectedError,
};
