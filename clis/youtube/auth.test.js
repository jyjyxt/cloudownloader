import { describe, expect, it, vi } from 'vitest';
import { getRegistry } from '@jyjyxt/cloudl/registry';
import { AuthRequiredError, TimeoutError } from '@jyjyxt/cloudl/errors';
import './auth.js';

const command = getRegistry().get('youtube/whoami');
const makePage = () => ({
  goto: vi.fn().mockResolvedValue(undefined),
  evaluate: vi.fn(),
  wait: vi.fn().mockResolvedValue(undefined),
  getCookies: vi.fn().mockResolvedValue([]),
});

describe('YouTube browser identity', () => {
  it('accepts the signed-in page even when no Google cookies are returned', async () => {
    const page = makePage();
    page.evaluate.mockResolvedValue({ kind: 'ok', identityLabel: 'Example Channel' });
    await expect(command.func(page, {})).resolves.toMatchObject({ logged_in: true, name: 'Example Channel' });
    expect(page.goto).toHaveBeenCalledWith('https://www.youtube.com/');
    expect(page.getCookies).not.toHaveBeenCalled();
  });

  it('waits for page initialization instead of reporting missing authentication', async () => {
    const page = makePage();
    page.evaluate.mockResolvedValueOnce({ kind: 'pending' }).mockResolvedValue({ kind: 'ok', identityLabel: null });
    await expect(command.func(page, {})).resolves.toMatchObject({ logged_in: true, name: null });
    expect(page.wait).toHaveBeenCalledWith(0.5);
  });

  it('rejects an authoritative signed-out page', async () => {
    const page = makePage();
    page.evaluate.mockResolvedValue({ kind: 'auth', detail: 'signed out' });
    await expect(command.func(page, {})).rejects.toBeInstanceOf(AuthRequiredError);
  });

  it('times out distinctly when the page never initializes', async () => {
    const page = makePage();
    page.evaluate.mockResolvedValue({ kind: 'pending' });
    await expect(command.func(page, {})).rejects.toBeInstanceOf(TimeoutError);
    expect(page.evaluate).toHaveBeenCalledTimes(20);
  });

  it('uses page state for the no-navigation quick check', async () => {
    const page = makePage();
    page.evaluate.mockResolvedValue({ kind: 'ok', identityLabel: null });
    await expect(command.authStatus.quickCheck(page)).resolves.toMatchObject({ logged_in: true });
    expect(page.goto).not.toHaveBeenCalled();
    expect(page.getCookies).not.toHaveBeenCalled();
  });
});
