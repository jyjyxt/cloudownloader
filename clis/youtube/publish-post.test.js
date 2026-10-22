import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { getRegistry } from '@jyjyxt/cloudl/registry';
import { ArgumentError, CommandExecutionError } from '@jyjyxt/cloudl/errors';

const bridge = vi.hoisted(() => ({ replies: [], calls: [] }));
vi.mock('node:child_process', () => {
  const execFile = vi.fn((file, args, options, callback) => {
    bridge.calls.push(args);
    const reply = bridge.replies.shift();
    if (reply instanceof Error) callback(reply);
    else callback(null, JSON.stringify(reply), '');
  });
  execFile[Symbol.for('nodejs.util.promisify.custom')] = (...args) => new Promise((resolve, reject) => {
    execFile(...args, (error, stdout, stderr) => error ? reject(error) : resolve({ stdout, stderr }));
  });
  return { execFile };
});
import { validatePost } from './publish-post.js';

const command = getRegistry().get('youtube/publish-post');
const channel = 'UC' + 'a'.repeat(22);
const bytes = Buffer.from('synthetic-image-content');
const imageHash = createHash('sha256').update(bytes).digest('hex');
const data = { channel, account: 'Example Channel', content: 'A concise caption.', image: 'image.jpg' };
const actual = {
  pageUrl: `https://www.youtube.com/channel/${channel}/posts`, signedIn: true,
  ownerLinks: [`https://studio.youtube.com/channel/${channel}/content`],
  composerAccount: data.account, visibilityLabel: 'Public', captionValue: data.content,
  editorVisible: true, canSubmit: true,
  attachments: [{ checksum: imageHash, ready: true, width: 1080, height: 1440 }], publishedCards: [],
};
const dirs = [];
function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'cloudl-youtube-post-test-'));
  dirs.push(dir);
  writeFileSync(join(dir, 'image.jpg'), bytes);
  const metadata = join(dir, 'post.json');
  writeFileSync(metadata, JSON.stringify(data));
  return { metadata, session: 'test-' + dir.split('-').at(-1) };
}
function prepareReplies() {
  bridge.replies.push({}, actual, { clicked: true }, { clicked: true }, {}, {}, { matches: 1, mode: 'contenteditable', text: data.content }, actual);
}
const controlCalls = () => bridge.calls.filter(call => call[2] === 'eval' && call[3]?.startsWith('(function clickPostControl'));
afterEach(() => {
  bridge.replies = []; bridge.calls = [];
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('YouTube public image post production command', () => {
  it('prepares and verifies the form without submitting by default', async () => {
    const args = setup(); prepareReplies();
    await expect(command.func(args)).resolves.toMatchObject([{ status: 'prepared', account: data.account }]);
    expect(controlCalls()).toHaveLength(2);
    expect(controlCalls().some(call => call[3].includes('})("#submit-button'))).toBe(false);
    expect(JSON.parse(readFileSync(args.metadata + '.state.json')).status).toBe('prepared');
  });

  it('rejects a different account before uploading or filling', async () => {
    const args = setup(); bridge.replies.push({}, { ...actual, composerAccount: 'Other Channel' });
    await expect(command.func(args)).rejects.toBeInstanceOf(CommandExecutionError);
    expect(bridge.calls.map(call => call[2])).toEqual(['open', 'eval']);
  });

  it('rejects edited or replaced image bytes before submission', async () => {
    const args = setup(); prepareReplies();
    bridge.replies[bridge.replies.length - 1] = { ...actual, attachments: [{ ready: true, checksum: 'different' }] };
    await expect(command.func({ ...args, execute: true })).rejects.toThrow('image bytes');
    expect(controlCalls().some(call => call[3].includes('#submit-button'))).toBe(false);
  });

  it('persists submitting before clicking and refuses a second attempt after uncertain delivery', async () => {
    const args = setup(); prepareReplies(); bridge.replies.push(new Error('connection lost'));
    await expect(command.func({ ...args, execute: true })).rejects.toThrow('connection lost');
    expect(JSON.parse(readFileSync(args.metadata + '.state.json')).status).toBe('submitting');
    const count = bridge.calls.length;
    await expect(command.func({ ...args, execute: true, resume: true })).rejects.toThrow('Do not retry');
    expect(bridge.calls).toHaveLength(count);
  });

  it('verifies a new permalink and returns the receipt on repeated calls without browser work', async () => {
    const args = setup(); prepareReplies();
    const card = { identifier: 'UgExamplePost', caption: data.content, author: data.account, hasImage: true };
    bridge.replies.push({ clicked: true }, { ...actual, publishedCards: [card] }, {}, { ...actual, publishedCards: [card] });
    const result = await command.func({ ...args, execute: true });
    expect(result[0]).toMatchObject({ status: 'published', url: 'https://www.youtube.com/post/UgExamplePost' });
    expect(controlCalls().filter(call => call[3].includes('#submit-button'))).toHaveLength(1);
    const count = bridge.calls.length;
    await expect(command.func({ ...args, execute: true })).resolves.toEqual(result);
    expect(bridge.calls).toHaveLength(count);
  });

  it('requires preparation before resuming and rejects silently ignored metadata', async () => {
    await expect(command.func({ ...setup(), resume: true })).rejects.toBeInstanceOf(ArgumentError);
    expect(() => validatePost({ ...data, title: 'ignored title' })).toThrow(ArgumentError);
    expect(() => validatePost({ ...data, content: 'x'.repeat(10001) })).toThrow(ArgumentError);
  });
});
