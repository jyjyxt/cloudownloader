import { describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { fillPublishField, normalizeParagraphText, readPublishField } from './publish-form.js';

function browserFor(text, mode = 'contenteditable', error) {
  return vi.fn(async action => {
    if (action === 'fill') { if (error) throw error; return { verified: true }; }
    return { matches: 1, mode, text };
  });
}

describe('publication field filling', () => {
  it('accepts paragraph formatting after a lost fill acknowledgement without filling twice', async () => {
    const browser = browserFor('第一段\u200b\n\n第二段\u200b\n', 'contenteditable', new Error('fill mismatch'));
    await expect(fillPublishField(browser, '.editor', '第一段\n第二段', { paragraphs: true }))
      .resolves.toMatchObject({ verified: true, normalization: 'paragraphs' });
    expect(browser.mock.calls.map(call => call[0])).toEqual(['fill', 'eval']);
  });
  it.each(['#字幕拼', '#字幕拼图图', '#字 幕拼图', '#字幕，拼图'])('blocks missing, repeated or altered content: %s', async actual => {
    await expect(fillPublishField(browserFor(actual), '.editor', '#字幕拼图', { paragraphs: true })).rejects.toThrow('does not match');
  });
  it('does not normalize ordinary input values or unrequested rich-text formatting', async () => {
    await expect(fillPublishField(browserFor(' 标题 ', 'value'), '#title', '标题', { paragraphs: true })).rejects.toThrow();
    await expect(fillPublishField(browserFor('正文\u200b'), '.editor', '正文')).rejects.toThrow();
    await expect(fillPublishField(browserFor('', 'value'), '#title', '')).resolves.toMatchObject({ normalization: 'exact' });
  });
  it('pads only the explicitly selected editor and still verifies the final word', async () => {
    const browser = browserFor('#字幕拼图\u200b\n\u200b');
    await fillPublishField(browser, '.editor', '#字幕拼图', { paragraphs: true, editorTail: true });
    expect(browser.mock.calls[0]).toEqual(['fill', '.editor', '#字幕拼图\n\n ']);
    await expect(fillPublishField(browserFor('#字幕拼'), '.editor', '#字幕拼图', { paragraphs: true, editorTail: true })).rejects.toThrow();
    await expect(fillPublishField(browser, '.editor', '正文', { editorTail: true })).rejects.toThrow('requires');
  });
  it('retains the original error when verification also fails', async () => {
    const error = new Error('transport unavailable');
    const browser = vi.fn().mockRejectedValue(error);
    await expect(fillPublishField(browser, '.editor', '正文')).rejects.toBe(error);
  });
  it('preserves links, accents, punctuation and interior whitespace', () => {
    expect(normalizeParagraphText('José / HUMAN\u200b\r\n\r\nhttps://example.com/?x=a%20b&y=2  #标签'))
      .toBe('José / HUMAN\nhttps://example.com/?x=a%20b&y=2  #标签');
  });
  it('reads the exact observed field and rejects ambiguous or noneditable targets', async () => {
    const dom = new JSDOM('<input id="title" value="标题"><div class="editor" contenteditable="true"></div><div class="editor"></div>', { runScripts: 'outside-only' });
    const read = selector => dom.window.eval(`(${readPublishField.toString()})(${JSON.stringify(selector)})`);
    expect(read('#title')).toEqual({ matches: 1, mode: 'value', text: '标题' });
    expect(read('.editor')).toEqual({ matches: 2 });
    const browser = vi.fn(async action => action === 'fill' ? {} : { matches: 2 });
    await expect(fillPublishField(browser, '.editor', '正文')).rejects.toThrow();
    dom.window.close();
  });
});
