import { describe, expect, it, vi } from 'vitest';
import { getRegistry } from '@jackwener/opencli/registry';
import './create-pin.js';

vi.mock('node:fs', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        statSync: vi.fn((p, _opts) => {
            if (String(p).includes('missing')) return undefined;
            return { isFile: () => true };
        }),
        readFileSync: vi.fn(() => Buffer.from([0xff, 0xd8, 0xff, 0xd9])),
    };
});

vi.mock('node:path', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        resolve: vi.fn((p) => `/abs/${p}`),
        extname: vi.fn((p) => {
            const m = String(p).match(/\.[^.]+$/);
            return m ? m[0] : '';
        }),
        basename: vi.fn((p) => String(p).split('/').pop() || ''),
    };
});

function makePage(evaluateResults = [], overrides = {}) {
    const evaluate = vi.fn();
    for (const result of evaluateResults) {
        evaluate.mockResolvedValueOnce(result);
    }
    evaluate.mockResolvedValue({ ok: true });

    return {
        goto: vi.fn().mockResolvedValue(undefined),
        wait: vi.fn().mockResolvedValue(undefined),
        evaluate,
        setFileInput: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    };
}

describe('pinterest create-pin command', () => {
    const getCommand = () => getRegistry().get('pinterest/create-pin');

    it.each([
        'Chrome Not allowed',
        'Page.fileChooserOpened not received within 5s — the input may not have opened a file chooser',
    ])('falls back to DataTransfer upload for recoverable file input error: %s', async (fileInputError) => {
        const command = getCommand();
        const setFileInput = vi.fn().mockRejectedValue(new Error(fileInputError));
        const page = makePage([
            { loggedIn: true, hasCreateSurface: true },
            { ok: true, profile: 'janedoe' },
            { loggedIn: true, hasCreateSurface: true },
            { ok: true, action: 'pin' },
            { ok: true, selector: 'input[type="file"]' },
            { ok: true, count: 1 },
            { ok: true, count: 1, mediaSelected: true },
            { ok: true, field: 'title' },
            { ok: true, kind: 'textarea' },
            { ok: true, field: 'description' },
            { ok: true, label: 'Publish', x: 100, y: 50 },
            { ok: false },
            { ok: true, url: 'https://www.pinterest.com/pin/123456789/' },
        ], {
            setFileInput,
            nativeClick: vi.fn().mockResolvedValue(undefined),
        });

        const result = await command.func(page, {
            image: 'ant.jpg',
            board: 'Ideas',
            title: 'Life Cycle of an Ant',
            description: 'Ant metamorphosis diagram.',
            timeout: 30,
        });

        const evaluateCalls = page.evaluate.mock.calls.map((args) => String(args[0]));
        expect(page.goto).toHaveBeenCalledWith('https://www.pinterest.com/janedoe/ideas/', {
            waitUntil: 'load',
            settleMs: 3000,
        });
        expect(setFileInput).toHaveBeenCalledWith(['/abs/ant.jpg'], 'input[type="file"]');
        expect(evaluateCalls.some((code) => code.includes('new DataTransfer()'))).toBe(true);
        expect(evaluateCalls.some((code) => code.includes('Could not assign files to input'))).toBe(true);
        expect(result).toEqual([{
            status: 'published',
            board: 'Ideas',
            title: 'Life Cycle of an Ant',
            url: 'https://www.pinterest.com/pin/123456789/',
        }]);
    });

    it('uploads through the generic CDP channel before using the chooser path', async () => {
        const command = getCommand();
        const cdp = vi.fn(async (method) => {
            if (method === 'DOM.getDocument') return { root: { nodeId: 1 } };
            if (method === 'DOM.querySelector') return { nodeId: 42 };
            return {};
        });
        const page = makePage([
            { loggedIn: true, hasCreateSurface: true },
            { ok: true, profile: 'janedoe' },
            { loggedIn: true, hasCreateSurface: true },
            { ok: true, action: 'pin' },
            { ok: true, selector: 'input[type="file"]' },
            { ok: true, count: 1 },
            { ok: true, count: 1, mediaSelected: true },
            { ok: true, field: 'title' },
            { ok: true, kind: 'textarea' },
            { ok: true, field: 'description' },
            { ok: true, label: 'Publish', x: 100, y: 50 },
            { ok: false },
            { ok: true, url: 'https://www.pinterest.com/pin/123456789/' },
        ], {
            cdp,
            nativeClick: vi.fn().mockResolvedValue(undefined),
        });

        await command.func(page, {
            image: 'ant.jpg',
            board: 'Ideas',
            title: 'Life Cycle of an Ant',
            description: 'Ant metamorphosis diagram.',
            timeout: 30,
        });

        expect(cdp).toHaveBeenCalledWith('DOM.setFileInputFiles', {
            files: ['/abs/ant.jpg'],
            nodeId: 42,
        });
        expect(page.evaluate.mock.calls.some(([code]) => String(code).includes("new Event('change'"))).toBe(true);
        expect(page.evaluate.mock.calls.some(([code]) => String(code).includes('image uploaded for pin creation'))).toBe(true);
        expect(page.setFileInput).not.toHaveBeenCalled();
    });
});
