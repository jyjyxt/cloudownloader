import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { getRegistry } from '@jyjyxt/cloudl/registry';
import { ArgumentError } from '@jyjyxt/cloudl/errors';
import { __test__ } from './publish.js';

function createPageMock(overrides = {}) {
  return {
    goto: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue(undefined),
    wait: vi.fn().mockResolvedValue(undefined),
    screenshot: vi.fn().mockResolvedValue(''),
    setFileInput: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeTempVideo(ext = '.mp4') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudl-wechat-channels-publish-'));
  const file = path.join(dir, `demo${ext}`);
  fs.writeFileSync(file, Buffer.from([0x00, 0x00, 0x00, 0x18]));
  return file;
}

describe('wechat-channels publish — registration', () => {
  it('is registered with the expected metadata', () => {
    const cmd = getRegistry().get('wechat-channels/publish');
    expect(cmd).toBeDefined();
    expect(cmd?.func).toBeTypeOf('function');
    expect(cmd?.access).toBe('write');
    expect(cmd?.domain).toBe('channels.weixin.qq.com');
    expect(cmd?.strategy).toBe('cookie');
  });

  it('declares video as the required positional argument', () => {
    const cmd = getRegistry().get('wechat-channels/publish');
    const video = cmd?.args.find((a) => a.name === 'video');
    expect(video?.positional).toBe(true);
    expect(video?.required).toBe(true);
  });

  it('exposes the documented optional flags', () => {
    const cmd = getRegistry().get('wechat-channels/publish');
    const names = new Set(cmd?.args.map((a) => a.name));
    for (const flag of ['title', 'caption', 'declaration', 'schedule', 'draft', 'manual', 'timeout']) {
      expect(names.has(flag)).toBe(true);
    }
    expect(names.has('cover')).toBe(false);
  });
});

describe('wechat-channels publish — helper contracts', () => {
  it('requires timeout to be a meaningful positive integer', () => {
    expect(__test__.parseTimeoutSeconds(undefined)).toBe(600);
    expect(__test__.parseTimeoutSeconds('30')).toBe(30);
    expect(() => __test__.parseTimeoutSeconds('0')).toThrowError(ArgumentError);
    expect(() => __test__.parseTimeoutSeconds('12.5')).toThrowError(ArgumentError);
  });

  it('rejects invalid and past schedule values before navigation', () => {
    expect(() => __test__.parseScheduleDate('not-a-date')).toThrowError(ArgumentError);
    expect(() => __test__.parseScheduleDate('2000-01-01 00:00:00')).toThrowError(ArgumentError);

    const future = __test__.parseScheduleDate(Date.now() + 3_600_000);
    expect(future).toBeInstanceOf(Date);
  });

  it('does not treat upload-only copy as publish success', () => {
    expect(__test__.submitSucceeded({
      isDraft: false,
      finalUrl: 'https://channels.weixin.qq.com/platform/post/create',
      successMsg: '上传成功',
    })).toBe(false);
    expect(__test__.submitSucceeded({
      isDraft: false,
      finalUrl: 'https://channels.weixin.qq.com/platform/post/create',
      successMsg: '审核中',
    })).toBe(true);
    expect(__test__.submitSucceeded({
      isDraft: true,
      finalUrl: 'https://channels.weixin.qq.com/platform/post/create',
      successMsg: '保存成功',
    })).toBe(true);
  });

  it('parses boolean flags without treating "false" as true', () => {
    expect(__test__.parseBooleanFlag(true)).toBe(true);
    expect(__test__.parseBooleanFlag('true')).toBe(true);
    expect(__test__.parseBooleanFlag('1')).toBe(true);
    expect(__test__.parseBooleanFlag(false)).toBe(false);
    expect(__test__.parseBooleanFlag('false')).toBe(false);
    expect(__test__.parseBooleanFlag(undefined)).toBe(false);
  });
});

describe('wechat-channels publish — input validation', () => {
  it('rejects a missing video file with ArgumentError', async () => {
    const cmd = getRegistry().get('wechat-channels/publish');
    const page = createPageMock();
    await expect(
      cmd.func(page, { video: '/no/such/file.mp4' }),
    ).rejects.toBeInstanceOf(ArgumentError);
    // Validation must fail before any navigation happens.
    expect(page.goto).not.toHaveBeenCalled();
  });

  it('rejects an unsupported video format with ArgumentError', async () => {
    const cmd = getRegistry().get('wechat-channels/publish');
    const badFile = makeTempVideo('.mkv');
    const page = createPageMock();
    await expect(
      cmd.func(page, { video: badFile }),
    ).rejects.toBeInstanceOf(ArgumentError);
    expect(page.goto).not.toHaveBeenCalled();
  });

  it('rejects invalid timeout before navigation', async () => {
    const cmd = getRegistry().get('wechat-channels/publish');
    const video = makeTempVideo('.mp4');
    const page = createPageMock();
    await expect(
      cmd.func(page, { video, timeout: 1 }),
    ).rejects.toBeInstanceOf(ArgumentError);
    expect(page.goto).not.toHaveBeenCalled();
  });

  it('rejects invalid schedule before navigation', async () => {
    const cmd = getRegistry().get('wechat-channels/publish');
    const video = makeTempVideo('.mp4');
    const page = createPageMock();
    await expect(
      cmd.func(page, { video, schedule: 'not-a-date' }),
    ).rejects.toBeInstanceOf(ArgumentError);
    expect(page.goto).not.toHaveBeenCalled();
  });

  it('requires a browser page', async () => {
    const cmd = getRegistry().get('wechat-channels/publish');
    const video = makeTempVideo('.mp4');
    await expect(cmd.func(null, { video })).rejects.toThrow();
  });
});

describe('wechat-channels publish — required video label', () => {
  it('fails before navigation for unsupported labels', async () => {
    const page = createPageMock();
    await expect(getRegistry().get('wechat-channels/publish').func(page, {
      video: makeTempVideo(), declaration: 'unsupported'
    })).rejects.toBeInstanceOf(ArgumentError);
    expect(page.goto).not.toHaveBeenCalled();
  });
  it.each([false, undefined])('blocks an unconfirmed label result: %s', async result => {
    const page = createPageMock({ evaluate: vi.fn().mockResolvedValue(result) });
    await expect(__test__.setVideoDeclaration(page, '个人观点，仅供参考')).rejects.toThrow('标注未保存');
  });
  it.each([{ manual: true }, { draft: true }, {}])('selects the default before any submit path: %j', async flags => {
    const calls = [];
    const page = createPageMock({ evaluate: vi.fn(async script => {
      if (script.includes("})('declaration',")) { calls.push('label'); return true; }
      if (script.includes('pageAction')) { calls.push('label'); return true; }
      if (script.includes('location.href')) return 'https://channels.weixin.qq.com/platform/post/list';
      if (script.includes('uploadFailed')) return { done: true };
      if (script.includes('(function(labels)')) { calls.push('submit'); return { ok: true }; }
      if (script.includes('(function(markers)')) return flags.draft ? '草稿已保存' : '发布成功';
      return { ok: true };
    }) });
    await getRegistry().get('wechat-channels/publish').func(page, { video: makeTempVideo(), ...flags });
    expect(calls).toEqual(flags.manual ? ['label'] : ['label', 'submit']);
    expect(page.evaluate.mock.calls.find(([s]) => s.includes('pageAction'))[0]).toContain('个人观点，仅供参考');
  });
});
