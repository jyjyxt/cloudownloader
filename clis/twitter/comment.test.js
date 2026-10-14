import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';
import { ArgumentError, CommandExecutionError } from '@jyjyxt/cloudl/errors';
import { getRegistry } from '@jyjyxt/cloudl/registry';
import { __test__ } from './comment.js';
import { __test__ as utilsTest } from './utils.js';
import { createPageMock as createBasePageMock } from '../test-utils.js';
const createPageMock = (results = [], overrides = {}) => createBasePageMock(results, {
    fillText: vi.fn(async (_selector, text) => ({ filled: true, verified: true, actual: text })),
    ...overrides,
});
const commentRow = (text, extras = {}) => ({ status: 'success', message: 'Comment posted successfully.', text, url: null, image: null, 'image-url': null, ...extras });

describe('twitter comment command', () => {
    it('opens the requested tweet and fills its exact comment text', async () => {
        const cmd = getRegistry().get('twitter/comment');
        expect(cmd?.func).toBeTypeOf('function');
        const page = createPageMock([
            { ok: true },
            { ok: true },
            { ok: true, message: 'Comment posted successfully.' },
        ]);
        const result = await cmd.func(page, {
            url: 'https://x.com/_kop6/status/2040254679301718161?s=20',
            text: 'text-only comment',
        });
        expect(page.goto).toHaveBeenCalledWith('https://x.com/_kop6/status/2040254679301718161?s=20', { waitUntil: 'load', settleMs: 2500 });
        expect(page.wait).toHaveBeenCalledWith({ selector: '[data-testid="tweetTextarea_0"]', timeout: 15 });
        expect(result).toEqual([
            {
                status: 'success',
                message: 'Comment posted successfully.',
                url: null, image: null, 'image-url': null,
                text: 'text-only comment',
            },
        ]);
    });
    it('typed-fails when the comment never leaves the composer', async () => {
        const cmd = getRegistry().get('twitter/comment');
        const page = createPageMock([
            { ok: true },
            { ok: true },
            { ok: false, message: 'Comment button is disabled or not found.' },
        ]);

        await expect(cmd.func(page, {
            url: 'https://x.com/_kop6/status/2040254679301718161',
            text: 'never sent',
        })).rejects.toMatchObject({
            name: 'CommandExecutionError',
            code: 'COMMAND_EXEC',
            exitCode: 1,
            message: 'Comment button is disabled or not found.',
            hint: expect.stringContaining('Nothing was posted'),
        });
    });

    it('reports an unconfirmed comment as temporary, without claiming nothing was posted', async () => {
        const cmd = getRegistry().get('twitter/comment');
        const page = createPageMock([
            { ok: true },
            { ok: true },
            { ok: false, unconfirmed: true, message: 'Comment submission did not complete before timeout.' },
        ]);

        await expect(cmd.func(page, {
            url: 'https://x.com/_kop6/status/2040254679301718161',
            text: 'unconfirmed',
        })).rejects.toMatchObject({
            name: 'TimeoutError',
            code: 'TIMEOUT',
            exitCode: 75,
            hint: expect.stringContaining('may already be live'),
        });
    });

    it('uploads a local image on the requested tweet when --image is provided', async () => {
        const cmd = getRegistry().get('twitter/comment');
        expect(cmd?.func).toBeTypeOf('function');
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudl-twitter-comment-'));
        const imagePath = path.join(tempDir, 'qr.png');
        fs.writeFileSync(imagePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        const setFileInput = vi.fn().mockResolvedValue(undefined);
        const page = createPageMock([
            { ok: true, previewCount: 1 },
            { ok: true },
            { ok: true },
            { ok: true, message: 'Comment posted successfully.' },
        ], {
            setFileInput,
        });
        const result = await cmd.func(page, {
            url: 'https://x.com/_kop6/status/2040254679301718161?s=20',
            text: 'comment with image',
            image: imagePath,
        });
        expect(page.goto).toHaveBeenCalledWith('https://x.com/_kop6/status/2040254679301718161?s=20', { waitUntil: 'load', settleMs: 2500 });
        expect(page.wait).toHaveBeenNthCalledWith(1, { selector: '[data-testid="tweetTextarea_0"]', timeout: 15 });
        expect(page.wait).toHaveBeenNthCalledWith(2, { selector: 'input[type="file"][data-testid="fileInput"]', timeout: 20 });
        expect(setFileInput).toHaveBeenCalledWith([imagePath], 'input[type="file"][data-testid="fileInput"]');
        expect(result).toEqual([
            {
                status: 'success',
                message: 'Comment posted successfully.',
                url: null, 'image-url': null,
                text: 'comment with image',
                image: imagePath,
            },
        ]);
    });
    it('downloads a remote image before uploading when --image-url is provided', async () => {
        const cmd = getRegistry().get('twitter/comment');
        expect(cmd?.func).toBeTypeOf('function');
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            headers: {
                get: vi.fn().mockReturnValue('image/png'),
            },
            arrayBuffer: vi.fn().mockResolvedValue(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]).buffer),
        });
        vi.stubGlobal('fetch', fetchMock);
        const setFileInput = vi.fn().mockResolvedValue(undefined);
        const page = createPageMock([
            { ok: true, previewCount: 1 },
            { ok: true },
            { ok: true },
            { ok: true, message: 'Comment posted successfully.' },
        ], {
            setFileInput,
        });
        const result = await cmd.func(page, {
            url: 'https://x.com/_kop6/status/2040254679301718161?s=20',
            text: 'comment with remote image',
            'image-url': 'https://example.com/qr',
        });
        expect(fetchMock).toHaveBeenCalledWith('https://example.com/qr');
        expect(setFileInput).toHaveBeenCalledTimes(1);
        const uploadedPath = setFileInput.mock.calls[0][0][0];
        // Tmp dir is created by utils.downloadRemoteImage with the
        // 'cloudl-twitter-' prefix; final extension comes from Content-Type.
        expect(uploadedPath).toMatch(/cloudl-twitter-.*\/image\.png$/);
        // Per-call tmp dir is removed in the adapter's finally block, so the
        // downloaded file no longer exists once the command returns.
        expect(fs.existsSync(uploadedPath)).toBe(false);
        expect(result).toEqual([
            {
                status: 'success',
                message: 'Comment posted successfully.',
                url: null, image: null,
                text: 'comment with remote image',
                'image-url': 'https://example.com/qr',
            },
        ]);
        vi.unstubAllGlobals();
    });
    it('opens the target tweet Reply dialog when its inline editor is unavailable', async () => {
        const cmd = getRegistry().get('twitter/comment');
        expect(cmd?.func).toBeTypeOf('function');
        const wait = vi.fn()
            .mockRejectedValueOnce(new Error('Selector not found: [data-testid="tweetTextarea_0"]'))
            .mockResolvedValue(undefined);
        const page = createPageMock([
            { ok: true }, // click target tweet page Comment button
            { ok: true }, // insert comment text
            { ok: true }, // click composer Comment button
            { ok: true, message: 'Comment posted successfully.' }, // submit completed
        ], { wait });

        const url = 'https://x.com/_kop6/status/2040254679301718161?s=20';
        const result = await cmd.func(page, { url, text: 'fallback comment' });

        expect(page.goto).toHaveBeenNthCalledWith(1, 'https://x.com/_kop6/status/2040254679301718161?s=20', { waitUntil: 'load', settleMs: 2500 });
        expect(page.goto).toHaveBeenCalledTimes(1);
        expect(page.evaluate.mock.calls[0][0]).toContain('[data-testid="reply"]');
        expect(wait).toHaveBeenLastCalledWith({ selector: '[data-testid="tweetTextarea_0"]', timeout: 15 });
        expect(result).toEqual([commentRow('fallback comment')]);
    });
    it('treats an X success toast as success after a Promise was collected error', async () => {
        const cmd = getRegistry().get('twitter/comment');
        expect(cmd?.func).toBeTypeOf('function');
        const evaluate = vi.fn()
            .mockResolvedValueOnce({ ok: true }) // insert comment text
            .mockResolvedValueOnce({ ok: true }) // click Comment
            .mockRejectedValueOnce(new Error('{"code":-32000,"message":"Promise was collected"}'))
            .mockResolvedValueOnce({
                ok: true,
                message: 'Comment posted successfully.',
                url: 'https://x.com/me/status/123',
            });
        const page = createPageMock([], { evaluate });

        const result = await cmd.func(page, {
            url: 'https://x.com/_kop6/status/2040254679301718161?s=20',
            text: 'toast recovery',
        });

        expect(page.wait).toHaveBeenCalledWith(2);
        expect(result).toEqual([{
            status: 'success',
            message: 'Comment posted successfully.',
            image: null, 'image-url': null,
            text: 'toast recovery',
            url: 'https://x.com/me/status/123',
        }]);
    });

    // Run the click + completion polling scripts against a DOM so current
    // submit evidence is tested instead of just trusting mocked evaluate rows.
    const runCommentAgainstDom = async (html, text, { afterClickHtml = '' } = {}) => {
        const cmd = getRegistry().get('twitter/comment');
        const dom = new JSDOM(`<!doctype html><body><div data-testid="primaryColumn"><div data-testid="tweetTextarea_0" data-cloudl-comment-editor contenteditable="true"></div><button data-testid="tweetButton">Reply</button>${html}</div></body>`, {
            url: 'https://x.com/_kop6/status/2040254679301718161?s=20',
            runScripts: 'outside-only',
        });
        dom.window.setTimeout = (callback) => {
            callback();
            return 0;
        };
        dom.window.HTMLElement.prototype.getClientRects = () => [{ width: 10, height: 10 }];
        let evaluateCount = 0;
        const page = createPageMock([], {
            evaluate: vi.fn((script) => {
                evaluateCount += 1;
                if (evaluateCount === 1) return Promise.resolve({ ok: true });
                if (evaluateCount === 2) {
                    const result = dom.window.eval(script);
                    if (afterClickHtml) {
                        dom.window.document.body.insertAdjacentHTML('beforeend', afterClickHtml);
                    }
                    return Promise.resolve(result);
                }
                return Promise.resolve(dom.window.eval(script));
            }),
        });

        return cmd.func(page, {
            url: 'https://x.com/_kop6/status/2040254679301718161?s=20',
            text,
        });
    };

    it('does not report comment success from a cleared composer without a fresh toast', async () => {
        await expect(runCommentAgainstDom('', 'cleared comment')).rejects.toMatchObject({
            name: 'TimeoutError',
            code: 'TIMEOUT',
            exitCode: 75,
            hint: expect.stringContaining('Comment submission did not complete before timeout.'),
        });
    });

    it('ignores a comment success toast that existed before clicking Comment', async () => {
        const oldToast = `
            <div role="alert">Your post was sent. <a href="/me/status/3333333333333333333">View</a></div>
        `;

        await expect(runCommentAgainstDom(oldToast, 'old comment toast')).rejects.toMatchObject({
            name: 'TimeoutError',
            code: 'TIMEOUT',
            exitCode: 75,
            hint: expect.stringContaining('Comment submission did not complete before timeout.'),
        });
    });

    it('returns the permalink from a fresh comment success toast only', async () => {
        const timeline = '<article><a href="/nasa/status/1111111111111111111">someone else</a></article>';
        const toast = `
            <div role="alert">Your post was sent. <a href="/me/status/4444444444444444444">View</a></div>
        `;

        await expect(runCommentAgainstDom(timeline, 'fresh comment toast', { afterClickHtml: toast })).resolves.toEqual([
            {
                status: 'success',
                message: 'Comment posted successfully.',
                image: null, 'image-url': null,
                text: 'fresh comment toast',
                url: 'https://x.com/me/status/4444444444444444444',
            },
        ]);
    });

    it('does not export a comment permalink from an untrusted toast link host', async () => {
        const toast = `
            <div role="alert">Your post was sent. <a href="https://example.com/me/status/5555555555555555555">View</a></div>
        `;

        await expect(runCommentAgainstDom('', 'comment bad host', { afterClickHtml: toast })).resolves.toEqual([
            commentRow('comment bad host'),
        ]);
    });

    it('unwraps Browser Bridge envelopes for comment action results', async () => {
        const cmd = getRegistry().get('twitter/comment');
        const page = createPageMock([
            { session: 'site:twitter', data: { ok: true } },
            { session: 'site:twitter', data: { ok: true } },
            {
                session: 'site:twitter',
                data: {
                    ok: true,
                    message: 'Comment posted successfully.',
                    url: 'https://x.com/me/status/6666666666666666666',
                },
            },
        ]);

        await expect(cmd.func(page, {
            url: 'https://x.com/_kop6/status/2040254679301718161?s=20',
            text: 'wrapped comment',
        })).resolves.toEqual([{
            status: 'success',
            message: 'Comment posted successfully.',
            image: null, 'image-url': null,
            text: 'wrapped comment',
            url: 'https://x.com/me/status/6666666666666666666',
        }]);
    });

    it('fails closed when comment completion returns a malformed status URL', async () => {
        const cmd = getRegistry().get('twitter/comment');
        const page = createPageMock([
            { ok: true },
            { ok: true },
            { ok: true, message: 'Comment posted successfully.', url: 'https://example.com/me/status/7777777777777777777' },
        ]);

        await expect(cmd.func(page, {
            url: 'https://x.com/_kop6/status/2040254679301718161?s=20',
            text: 'bad comment url',
        })).rejects.toMatchObject({ code: 'TIMEOUT', hint: expect.stringContaining('malformed status url') });
    });

    it('rejects using --image and --image-url together', async () => {
        const cmd = getRegistry().get('twitter/comment');
        expect(cmd?.func).toBeTypeOf('function');
        const page = createPageMock([]);
        await expect(cmd.func(page, {
            url: 'https://x.com/_kop6/status/2040254679301718161?s=20',
            text: 'nope',
            image: '/tmp/a.png',
            'image-url': 'https://example.com/a.png',
        })).rejects.toThrow(ArgumentError);
    });
    it('rejects malformed tweet URLs before any browser interaction', () => {
        // buildCommentTargetUrl runs parseTweetUrl synchronously; substring matches
        // and off-domain hosts now throw ArgumentError instead of silently
        // producing a wrong-host /compose/post URL.
        expect(() => __test__.buildCommentTargetUrl('https://x.com/alice/home')).toThrow(ArgumentError);
        expect(() => __test__.buildCommentTargetUrl('https://x.com.evil.com/alice/status/2040254679301718161')).toThrow(ArgumentError);
        expect(() => __test__.buildCommentTargetUrl('not a url')).toThrow(ArgumentError);
    });
    it('validates the target tweet URL for both /<user>/status/<id> and /i/status/<id> shapes', () => {
        expect(__test__.buildCommentTargetUrl('https://x.com/_kop6/status/2040254679301718161?s=20'))
            .toBe('https://x.com/_kop6/status/2040254679301718161?s=20');
        expect(__test__.buildCommentTargetUrl('https://x.com/i/status/2040318731105313143'))
            .toBe('https://x.com/i/status/2040318731105313143');
    });
});

describe('twitter image helpers (utils.js)', () => {
    it('rejects invalid image paths early', () => {
        expect(() => utilsTest.resolveImagePath('/tmp/does-not-exist.png'))
            .toThrow(ArgumentError);
    });
    it('prefers content-type when resolving remote image extensions', () => {
        expect(utilsTest.resolveImageExtension('https://example.com/no-ext', 'image/webp')).toBe('.webp');
        expect(utilsTest.resolveImageExtension('https://example.com/a.jpeg?x=1', null)).toBe('.jpeg');
    });

    it('classifies CDP NotAllowed file-input failures as recoverable', () => {
        expect(utilsTest.isRecoverableFileInputError(new Error('NotAllowedError: Not allowed'))).toBe(true);
        expect(utilsTest.isRecoverableFileInputError(new Error('ProtocolError: not-allowed'))).toBe(true);
        expect(utilsTest.isRecoverableFileInputError(new Error('Permission denied'))).toBe(false);
    });

    it('fails closed when a composer image preview never appears', async () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudl-twitter-helper-'));
        const imagePath = path.join(tempDir, 'missing-preview.png');
        fs.writeFileSync(imagePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
        const page = createPageMock([{ ok: false, message: 'Image upload timed out (30s).' }], {
            setFileInput: vi.fn().mockResolvedValue(undefined),
        });

        await expect(utilsTest.attachComposerImage(page, imagePath)).rejects.toThrow('Image upload timed out');
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('does not treat an empty attachments container as uploaded media', async () => {
        const runMediaReadyProbe = async (html) => {
            const dom = new JSDOM(`<!doctype html><body>${html}</body>`, {
                url: 'https://x.com/compose/post',
                runScripts: 'outside-only',
            });
            dom.window.setTimeout = (callback) => {
                callback();
                return 0;
            };
            const page = {
                evaluate: vi.fn(async (script) => dom.window.eval(script)),
            };
            return utilsTest.waitForComposerMediaReady(page, 1);
        };

        await expect(runMediaReadyProbe('<div data-testid="attachments"></div>'))
            .resolves.toMatchObject({ ok: false });
        await expect(runMediaReadyProbe('<div data-testid="attachments"><img src="blob:https://x.com/1"></div>'))
            .resolves.toMatchObject({ ok: true, previewCount: 1 });
    });
});


describe('twitter comment exact input and submission boundaries', () => {
    it('does not select an unrelated dialog editor instead of the target inline editor', async () => {
        const dom = new JSDOM(`<body>
            <div role="dialog"><a href="/other/status/999">other tweet</a><div data-testid="tweetTextarea_0" contenteditable="true">unrelated draft</div></div>
            <div data-testid="primaryColumn"><article><a href="/example/status/123"><time>today</time></a></article><div data-testid="tweetTextarea_0" contenteditable="true">old draft</div></div>
        </body>`, {url:'https://x.com/example/status/123',runScripts:'outside-only'});
        dom.window.HTMLElement.prototype.getClientRects=()=>[{width:10,height:10}];
        const page=createPageMock([],{
            evaluate:vi.fn(script=>Promise.resolve(dom.window.eval(script))),
            fillText:vi.fn(async(selector,text)=>{
                const editor=dom.window.document.querySelector(selector);
                editor.textContent=text;
                return {filled:true,verified:true,actual:editor.textContent};
            }),
        });
        try {
            await expect(__test__.insertCommentText(page,'first line\nhttps://example.com','123')).resolves.toEqual({ok:true});
            expect(dom.window.document.querySelector('[role="dialog"] [contenteditable]').textContent).toBe('unrelated draft');
            expect(dom.window.document.querySelector('[data-testid="primaryColumn"] [contenteditable]').textContent).toBe('first line\nhttps://example.com');
        } finally {dom.window.close();}
    });

    it('refuses to type when the requested tweet is missing', async () => {
        const dom=new JSDOM('<body><div data-testid="primaryColumn"><article><a href="/other/status/1234">other</a></article><div data-testid="tweetTextarea_0" contenteditable="true"></div></div></body>',{url:'https://x.com/example/status/123',runScripts:'outside-only'});
        dom.window.HTMLElement.prototype.getClientRects=()=>[{width:10,height:10}];
        const page=createPageMock([],{evaluate:vi.fn(script=>Promise.resolve(dom.window.eval(script)))});
        try {
            await expect(__test__.insertCommentText(page,'must not post','123')).resolves.toMatchObject({ok:false});
            expect(page.fillText).not.toHaveBeenCalled();
        } finally {dom.window.close();}
    });

    it('marks a lost connection after the submit action as unconfirmed without replaying', async () => {
        const evaluate=vi.fn().mockResolvedValueOnce({ok:true}).mockRejectedValueOnce(new Error('bridge disconnected'));
        const page=createPageMock([],{evaluate});
        await expect(getRegistry().get('twitter/comment').func(page,{url:'https://x.com/example/status/123',text:'one attempt'})).rejects.toMatchObject({code:'TIMEOUT',hint:expect.stringContaining('may already be live')});
        expect(evaluate).toHaveBeenCalledTimes(2);
        expect(page.fillText).toHaveBeenCalledTimes(1);
    });

    it('registers only the current comment command', () => {
        expect(getRegistry().get('twitter/comment')).toBeDefined();
        expect(getRegistry().get('twitter/reply')).toBeUndefined();
    });

    it('passes multiline Chinese, bullets and two URLs unchanged to shared fill', async () => {
        const text = '开源项目：\nhttps://github.com/example/project\n\n• 安装说明 → ' + String.fromCharCode(96) + 'guide' + String.fromCharCode(96) + '\nhttps://example.com/skills/project';
        const page = createPageMock([{ok:true},{ok:true},{ok:true,message:'Comment posted successfully.'}]);
        await getRegistry().get('twitter/comment').func(page,{url:'https://x.com/example/status/123',text});
        expect(page.fillText).toHaveBeenCalledExactlyOnceWith('[data-cloudl-comment-editor]',text);
        expect(page.evaluate.mock.calls[0][0]).not.toContain("execCommand('insertText'");
    });

    it('stops before submitting when shared fill cannot verify exact text', async () => {
        const page = createPageMock([{ok:true}],{fillText:vi.fn().mockResolvedValue({filled:true,verified:false,actual:'stale draft'})});
        await expect(getRegistry().get('twitter/comment').func(page,{url:'https://x.com/example/status/123',text:'new comment'})).rejects.toMatchObject({code:'COMMAND_EXEC',hint:expect.stringContaining('Nothing was posted')});
        expect(page.evaluate).toHaveBeenCalledTimes(1);
    });

    it.each(['', '  \n '])('rejects empty text before opening the browser', async text => {
        const page=createPageMock();
        await expect(getRegistry().get('twitter/comment').func(page,{url:'https://x.com/example/status/123',text})).rejects.toThrow(ArgumentError);
        expect(page.goto).not.toHaveBeenCalled();
    });

    it('rejects a bad tweet URL before image download or navigation', async () => {
        const page=createPageMock();
        const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
        try {
            await expect(getRegistry().get('twitter/comment').func(page,{url:'https://example.com/status/123',text:'test','image-url':'https://example.com/image.png'})).rejects.toThrow(ArgumentError);
            expect(page.goto).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
        } finally {vi.unstubAllGlobals();}
    });
});
