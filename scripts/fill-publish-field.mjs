#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { Command } from 'commander';
import { fillPublishField } from '../clis/_shared/publish-form.js';

const run = promisify(execFile);
const program = new Command()
  .description('Fill and verify one publication field from JSON; does not submit or save publication history')
  .argument('<metadata>', 'JSON file containing the requested text')
  .requiredOption('--session <name>', 'Existing Cloudl browser session')
  .requiredOption('--selector <css>', 'Exact observed editable-field selector')
  .requiredOption('--field <key>', 'String property in the JSON file')
  .option('--paragraphs', 'Allow only rich-editor paragraph breaks and invisible caret markers', false)
  .option('--editor-tail', 'Pad Douyin rich-text input with a disposable blank line', false);

program.action(async (metadata, options) => {
  const data = JSON.parse(readFileSync(resolve(metadata), 'utf8'));
  if (typeof data[options.field] !== 'string') throw new Error(`Metadata field ${options.field} must be a string`);
  const browser = async (...args) => {
    const { stdout } = await run('cloudl', ['browser', options.session, ...args], { timeout: 65000, maxBuffer: 3000000 });
    return JSON.parse(stdout);
  };
  const result = await fillPublishField(browser, options.selector, data[options.field], options);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
});
try { await program.parseAsync(); }
catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
