import { describe, expect, it, vi } from 'vitest';
import { ArgumentError, AuthRequiredError, CommandExecutionError } from '@jackwener/opencli/errors';
import { getRegistry } from '@jackwener/opencli/registry';
import { __test__, command } from './post.js';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    statSync: vi.fn(() => ({ isFile: () => true })),
    readFileSync: vi.fn(() => Buffer.from('facebook-image')),
  };
});

vi.mock('node:path', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    resolve: vi.fn((value) => `/abs/${value}`),
  };
});

function makePage(evaluateResults = [], overrides = {}) {
  const evaluate = vi.fn();
  for (const result of evaluateResults) evaluate.mockResolvedValueOnce(result);
  evaluate.mockResolvedValue({ ok: true });
  return {
    goto: vi.fn().mockResolvedValue(undefined),
    wait: vi.fn().mockResolvedValue(undefined),
    evaluate,
    nativeType: vi.fn().mockResolvedValue(undefined),
    setFileInput: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('facebook post command', () => {
  it('registers a write command with text and optional image arguments', () => {
    const registered = getRegistry().get('facebook/post');
    expect(registered).toMatchObject(command);
    expect(registered?.access).toBe('write');
    expect(registered?.columns).toEqual(['status', 'message', 'text', 'image', 'verification']);
    expect(registered?.args.map((arg) => arg.name)).toEqual(['text', 'image']);
  });

  it('rejects empty text before opening Facebook', async () => {
    const page = makePage();
    await expect(command.func(page, { text: '   ' })).rejects.toBeInstanceOf(ArgumentError);
    expect(page.goto).not.toHaveBeenCalled();
  });

  it('publishes a text-only post after verifying the composer and success state', async () => {
    const page = makePage([
      { ok: true, opened: true },
      { ok: true }, // focus
      { ok: true }, // verify typed text
      { ok: true }, // click Post
      { ok: true, verification: 'success_toast', message: 'Your post was published.' },
    ]);

    await expect(command.func(page, { text: 'hello Facebook' })).resolves.toEqual([{
      status: 'success',
      message: 'Your post was published.',
      text: 'hello Facebook',
      image: '',
      verification: 'success_toast',
    }]);

    expect(page.goto).toHaveBeenCalledWith('https://www.facebook.com/', { waitUntil: 'load', settleMs: 3000 });
    expect(page.wait).toHaveBeenCalledWith({ selector: expect.stringContaining('[contenteditable="true"]'), timeout: 15 });
    expect(page.nativeType).toHaveBeenCalledWith('hello Facebook');
  });

  it('uploads an optional image before inserting post text', async () => {
    const page = makePage([
      { ok: true, opened: true },
      { ok: true }, // prepare image control
      { ok: true, selector: '[data-opencli-facebook-upload-target="true"]' },
      { ok: true }, // image preview
      { ok: true }, // focus
      { ok: true }, // verify typed text
      { ok: true }, // click Post
      { ok: true, verification: 'composer_closed', message: 'Facebook composer closed after publishing.' },
    ]);

    await expect(command.func(page, { text: 'photo post', image: 'photo.png' })).resolves.toMatchObject([{
      status: 'success',
      text: 'photo post',
      image: 'photo.png',
    }]);
    expect(page.setFileInput).toHaveBeenCalledWith(
      ['/abs/photo.png'],
      '[data-opencli-facebook-upload-target="true"]',
    );
    expect(page.setFileInput.mock.invocationCallOrder[0]).toBeLessThan(page.nativeType.mock.invocationCallOrder[0]);
  });

  it('maps a login wall to AuthRequiredError', async () => {
    const page = makePage([{ ok: false, reason: 'auth' }]);
    await expect(command.func(page, { text: 'hello' })).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it('fails when the composer cannot be opened', async () => {
    const page = makePage([{ ok: false, reason: 'composer_trigger_missing' }]);
    await expect(command.func(page, { text: 'hello' })).rejects.toBeInstanceOf(CommandExecutionError);
  });

  it('validates image extensions and file existence before navigation', async () => {
    const page = makePage();
    await expect(command.func(page, { text: 'hello', image: 'photo.bmp' })).rejects.toThrow('Unsupported Facebook image format');
    expect(page.goto).not.toHaveBeenCalled();
  });

  it('throws when no browser session is available', async () => {
    await expect(command.func(null, { text: 'hello' })).rejects.toThrow('Browser session required for facebook post');
  });

  it('builds scripts that target the composer and avoid stale success toasts', () => {
    expect(__test__.buildOpenComposerScript()).toContain('what are you thinking');
    expect(__test__.buildSubmitClickScript('hello')).toContain('data-opencli-facebook-before-submit-toast');
    expect(__test__.buildSubmitStatusScript('hello')).toContain('composer_closed');
  });
});
