import { ArgumentError, CommandExecutionError } from '@jyjyxt/cloudl/errors';

// Rich editors can insert invisible caret markers and extra paragraph breaks.
// Keep words, punctuation and spaces inside each line unchanged.
export function normalizeParagraphText(text) {
  return text.replace(/\u200b/g, '').replace(/\r\n?/g, '\n').split('\n')
    .map(line => line.trim()).filter(Boolean).join('\n');
}

export function readPublishField(selector) {
  const matches = document.querySelectorAll(selector);
  if (matches.length !== 1) return { matches: matches.length };
  const element = matches[0];
  const mode = element.isContentEditable ? 'contenteditable'
    : ['INPUT', 'TEXTAREA'].includes(element.tagName) ? 'value' : '';
  return { matches: 1, mode, text: mode === 'contenteditable' ? element.innerText : element.value };
}

/** Fill once, then read the actual field even when the fill acknowledgement fails. */
export async function fillPublishField(browser, selector, text, { paragraphs = false, editorTail = false } = {}) {
  if (typeof selector !== 'string' || !selector.trim() || typeof text !== 'string')
    throw new ArgumentError('Require a CSS selector and a string field value');
  if (editorTail && !paragraphs)
    throw new ArgumentError('editorTail requires explicit paragraph normalization');
  // Douyin can consume the final input character. Only pad when explicitly
  // requested; verify against the original text, never the padded input.
  const input = editorTail ? text + '\n\n ' : text;
  let fillError;
  try { await browser('fill', selector, input); }
  catch (error) { fillError = error; }
  let actual;
  try { actual = await browser('eval', `(${readPublishField.toString()})(${JSON.stringify(selector)})`); }
  catch (error) { throw fillError || error; }
  const exact = actual?.matches === 1 && !!actual.mode && actual.text === text;
  const normalized = actual?.matches === 1 && actual.mode === 'contenteditable' && paragraphs
    && typeof actual.text === 'string' && normalizeParagraphText(actual.text) === normalizeParagraphText(text);
  if (!exact && !normalized)
    throw fillError || new CommandExecutionError('Published field text does not match the requested value; inspect the editor before submission');
  return { filled: true, verified: true, normalization: exact ? 'exact' : 'paragraphs', actual: actual.text };
}
