import { describe, expect, it, vi } from 'vitest';
import { AuthRequiredError, EmptyResultError } from '@jyjyxt/cloudl/errors';
import { getRegistry } from '@jyjyxt/cloudl/registry';
import './create-draft.js';
import './drafts.js';
import './search.js';

function createPageMock(overrides = {}) {
    return {
        goto: vi.fn().mockResolvedValue(undefined),
        wait: vi.fn().mockResolvedValue(undefined),
        evaluate: overrides.evaluate ?? vi.fn().mockResolvedValue(undefined),
        setFileInput: vi.fn().mockResolvedValue(undefined),
        click: vi.fn().mockResolvedValue(undefined),
        nativeClick: vi.fn().mockResolvedValue(undefined),
    };
}

describe('weixin command registration', () => {
    it('registers create-draft and drafts commands', () => {
        const registry = getRegistry();
        const values = [...registry.values()];
        const createDraftCommand = values.find(c => c.site === 'weixin' && c.name === 'create-draft');
        expect(createDraftCommand).toBeDefined();
        expect(createDraftCommand.args.find((arg) => arg.name === 'original-declaration')).toBeDefined();
        expect(createDraftCommand.args.find((arg) => arg.name === 'reward')).toMatchObject({ type: 'bool', default: false });
        expect(createDraftCommand.args.find((arg) => arg.name === 'reward-account')).toBeDefined();
        expect(createDraftCommand.args.find((arg) => arg.name === 'collection')).toBeUndefined();
        const draftsCommand = values.find(c => c.site === 'weixin' && c.name === 'drafts');
        expect(draftsCommand).toBeDefined();
        expect(draftsCommand.args.find((arg) => arg.name === 'timeout')).toMatchObject({ type: 'int', default: 60 });
        expect(values.find(c => c.site === 'weixin' && c.name === 'search')).toBeDefined();
    });
});

describe('weixin drafts command', () => {
    it('throws AuthRequiredError when no session token is available', async () => {
        const command = getRegistry().get('weixin/drafts');
        const page = createPageMock({
            evaluate: vi.fn().mockResolvedValueOnce(undefined),
        });

        await expect(command.func(page, { limit: 10 })).rejects.toBeInstanceOf(AuthRequiredError);
    });

    it('fails instead of scraping arbitrary body text when structured selectors miss', async () => {
        const command = getRegistry().get('weixin/drafts');
        const evaluate = vi.fn()
            .mockResolvedValueOnce('123456')
            .mockImplementationOnce(async (script) => {
                expect(script).not.toContain('document.body.innerText');
                return [];
            });
        const page = createPageMock({ evaluate });

        await expect(command.func(page, { limit: 10 })).rejects.toBeInstanceOf(EmptyResultError);
    });

    it('returns structured drafts and respects the requested limit', async () => {
        const command = getRegistry().get('weixin/drafts');
        const page = createPageMock({
            evaluate: vi.fn()
                .mockResolvedValueOnce('123456')
                .mockResolvedValueOnce([
                    { Index: 1, Title: '第一篇草稿', Time: '2026-04-24 10:00' },
                    { Index: 2, Title: '第二篇草稿', Time: '2026-04-24 11:00' },
                ]),
        });

        const result = await command.func(page, { limit: 1 });

        expect(result).toEqual([
            { Index: 1, Title: '第一篇草稿', Time: '2026-04-24 10:00' },
        ]);
    });
});

describe('weixin create-draft command', () => {
    it('reuses the uploaded article image metadata for the cover without a Base64 page command', async () => {
        const command = getRegistry().get('weixin/create-draft');
        const evaluate = vi.fn().mockImplementation(async (script) => {
            if (script.includes('window.location.href.match')) return '123456';
            if (script.includes('!!document.querySelector("textarea#title")')) return true;
            if (script.includes("reason: 'content editor not found'")) return { ok: true };
            if (script.includes('var range = document.createRange()')) return true;
            if (script.includes('var imageSelector =') && script.includes('errorText')) return { ok: true, cdnCount: 1 };
            if (script.includes('return { ok: images.length > 0')) return { ok: true, count: 1 };
            if (script.includes('return { count: editor ?')) return { count: 1 };
            if (script.includes('!!window.__cloudlWeixinCoverPatch?.applied')) return true;
            if (script.includes('window.__cloudlWeixinCoverPatch')) return { ok: true, fileId: '110000001', cdnUrl: 'https://mmbiz.qpic.cn/test.jpg' };
            if (script.includes("=== '保存为草稿'")) return { ok: true };
            if (script.includes("document.querySelector('#js_save_success')")) return true;
            if (script.includes('var el = document.querySelector')) return { ok: true };
            return undefined;
        });
        const page = createPageMock({ evaluate });

        const result = await command.func(page, {
            title: '测试草稿',
            content: '测试正文',
            'cover-image': new URL('../../package.json', import.meta.url).pathname,
            reward: false,
        });

        expect(page.setFileInput).toHaveBeenCalledOnce();
        expect(evaluate.mock.calls.some(([script]) => script.includes('base64'))).toBe(false);
        expect(result).toEqual([{ status: 'draft saved', detail: '"测试草稿" (with cover)' }]);
    });

    it('does not send a large DataTransfer payload when the cover fallback is needed', async () => {
        const command = getRegistry().get('weixin/create-draft');
        const evaluate = vi.fn().mockImplementation(async (script) => {
            if (script.includes('window.location.href.match')) return '123456';
            if (script.includes('!!document.querySelector("textarea#title")')) return true;
            if (script.includes("reason: 'content editor not found'")) return { ok: true };
            if (script.includes('var range = document.createRange()')) return true;
            if (script.includes('var assigned = false')) return { ok: true, count: 1 };
            if (script.includes('var imageSelector =') && script.includes('errorText')) return { ok: true, cdnCount: 1 };
            if (script.includes('return { ok: images.length > 0')) return { ok: true, count: 1 };
            if (script.includes('return { count: editor ?')) return { count: 1 };
            if (script.includes('!!window.__cloudlWeixinCoverPatch?.applied')) return true;
            if (script.includes('window.__cloudlWeixinCoverPatch')) return { ok: true, fileId: '110000002', cdnUrl: 'https://mmbiz.qpic.cn/test-2.jpg' };
            if (script.includes("=== '保存为草稿'")) return { ok: true };
            if (script.includes("document.querySelector('#js_save_success')")) return true;
            if (script.includes('var el = document.querySelector')) return { ok: true };
            return undefined;
        });
        const page = createPageMock({ evaluate });
        page.setFileInput.mockRejectedValue(
            new Error('Page.fileChooserOpened not received within 5s — the input may not have opened a file chooser'),
        );

        const result = await command.func(page, {
            title: '回退测试',
            content: '测试正文',
            'cover-image': new URL('../../package.json', import.meta.url).pathname,
            reward: false,
        });

        expect(page.setFileInput).toHaveBeenCalledOnce();
        expect(evaluate.mock.calls.some(([script]) => script.includes("['dragenter', 'dragover', 'drop']"))).toBe(false);
        expect(result).toEqual([{ status: 'draft saved', detail: '"回退测试" (with cover)' }]);
    });
});

describe('weixin multi-image draft layout', () => {
    const files = [
        new URL('../../package.json', import.meta.url).pathname,
        new URL('../../README.md', import.meta.url).pathname,
    ];

    function multiPage({ invalidLayout = false, delaySecond = false } = {}) {
        let uploads = 0;
        let delayed = false;
        const events = [];
        const expectedCounts = [];
        const evaluate = vi.fn(async script => {
            if (script.includes('window.location.href.match')) return '123456';
            if (script.includes('!!document.querySelector("textarea#title")')) return true;
            if (script.includes("reason: 'content editor not found'") && !script.includes('var expectedImageCount')) return { ok: true };
            if (script.includes("reason: 'footer editor not found'")) { events.push('footer'); return { ok: true }; }
            if (script.includes('var range = document.createRange()')) return { imageCount: uploads };
            if (script.includes('var imageSelector =') && script.includes('errorText')) {
                const expected = Number(script.match(/cdnCount >= (\d+)/)[1]);
                expectedCounts.push(expected);
                if (delaySecond && expected === 2 && !delayed) {
                    delayed = true;
                    return { ok: false, cdnCount: 1 };
                }
                return { ok: uploads >= expected, cdnCount: uploads };
            }
            if (script.includes('return { ok: images.length > 0')) return { ok: true, count: uploads };
            if (script.includes('var expectedImageCount')) {
                events.push('verify');
                return { ok: !invalidLayout, imageCount: uploads, footerAfterImages: !invalidLayout };
            }
            if (script.includes('return { count: editor ?')) return { count: uploads };
            if (script.includes('!!window.__cloudlWeixinCoverPatch?.applied')) return true;
            if (script.includes('window.__cloudlWeixinCoverPatch')) return { ok: true, fileId: '110001', cdnUrl: 'https://mmbiz.qpic.cn/1.jpg' };
            if (script.includes("=== '保存为草稿'")) { events.push('save'); return { ok: true }; }
            if (script.includes("document.querySelector('#js_save_success')")) return true;
            if (script.includes('var el = document.querySelector')) return { ok: true };
            return undefined;
        });
        const page = createPageMock({ evaluate });
        page.setFileInput.mockImplementation(async paths => {
            uploads += 1;
            events.push(paths[0]);
        });
        return { page, events, expectedCounts };
    }

    it('uploads in order, reuses the cover image, and appends sources last', async () => {
        const { page, events } = multiPage();
        const result = await getRegistry().get('weixin/create-draft').func(page, {
            title: '两盏灯', images: files.join(','), 'cover-image': files[0],
            footer: '参考来源\nOpenStax', reward: false,
        });
        expect(page.setFileInput.mock.calls.map(([paths]) => paths[0])).toEqual(files);
        expect(events).toEqual([...files, 'footer', 'verify', 'save']);
        expect(result[0]).toMatchObject({ status: 'draft saved', detail: '"两盏灯" (with cover) (2 images)' });
    });

    it('waits for the newly uploaded image rather than accepting an old CDN image', async () => {
        const { page, expectedCounts } = multiPage({ delaySecond: true });
        await getRegistry().get('weixin/create-draft').func(page, {
            title: '等待上传', images: files.join(','), footer: '参考来源', reward: false,
        });
        expect(expectedCounts).toEqual([1, 2, 2]);
    });

    it('does not save when the image count or footer position is wrong', async () => {
        const { page, events } = multiPage({ invalidLayout: true });
        await expect(getRegistry().get('weixin/create-draft').func(page, {
            title: '校验', images: files.join(','), footer: '参考来源', reward: false,
        })).rejects.toThrow('requested layout');
        expect(events).not.toContain('save');
    });

    it('rejects a missing image before opening the editor', async () => {
        const { page } = multiPage();
        await expect(getRegistry().get('weixin/create-draft').func(page, {
            title: '缺图', images: '/does-not-exist/cloudl-image.jpg',
        })).rejects.toThrow('Image not found');
        expect(page.goto).not.toHaveBeenCalled();
    });

    it('rejects a cover outside the body images to avoid adding an extra image', async () => {
        const { page } = multiPage();
        await expect(getRegistry().get('weixin/create-draft').func(page, {
            title: '封面', images: files[0], 'cover-image': files[1],
        })).rejects.toThrow('--cover-image must name one of the --images files');
        expect(page.goto).not.toHaveBeenCalled();
    });
});
