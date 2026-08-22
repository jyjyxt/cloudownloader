import { JSDOM } from 'jsdom';
import { vi } from 'vitest';
import { createPageMock } from '../test-utils.js';

export function createTwitterDomPage(html, url = 'https://x.com/alice/status/2040254679301718161') {
    const dom = new JSDOM(html, {
        url,
        runScripts: 'outside-only',
    });
    dom.window.setTimeout = (callback) => {
        callback();
        return 0;
    };
    return createPageMock([], {
        evaluate: vi.fn((script) => Promise.resolve(dom.window.eval(String(script)))),
    });
}
