import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArgumentError } from './errors.js';
import { listCloudlSkills, readCloudlSkill } from './skills.js';

function makePackageRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudl-skills-'));
  fs.mkdirSync(path.join(root, 'skills', 'cloudl-browser', 'references'), { recursive: true });
  fs.mkdirSync(path.join(root, 'skills', 'cloudl-autofix'), { recursive: true });
  fs.mkdirSync(path.join(root, 'skills', 'smart-search'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"@jyjyxt/cloudl"}\n');
  fs.writeFileSync(path.join(root, 'skills', 'cloudl-browser', 'SKILL.md'), [
    '---',
    'name: cloudl-browser',
    'description: Browser control skill',
    'version: 1.2.3',
    '---',
    '',
    '# Browser',
    '',
    'Body.',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(root, 'skills', 'cloudl-browser', 'references', 'targets.md'), '# Targets\n');
  fs.writeFileSync(path.join(root, 'skills', 'cloudl-autofix', 'SKILL.md'), [
    '---',
    'name: cloudl-autofix',
    'description: Fix adapters: keep scope narrow',
    '---',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(root, 'skills', 'smart-search', 'SKILL.md'), [
    '---',
    'name: smart-search',
    'description: Search skill',
    '---',
    '',
  ].join('\n'));
  return root;
}

describe('cloudl skills content', () => {
  it('lists only cloudl-prefixed skills', () => {
    const root = makePackageRoot();

    expect(listCloudlSkills(root).map((skill) => skill.name)).toEqual([
      'cloudl-autofix',
      'cloudl-browser',
    ]);
    expect(listCloudlSkills(root).find((skill) => skill.name === 'cloudl-autofix')?.description)
      .toBe('Fix adapters: keep scope narrow');
  });

  it('reads a skill SKILL.md and reference file', () => {
    const root = makePackageRoot();

    expect(readCloudlSkill('cloudl-browser', '', root)).toMatchObject({
      skill: 'cloudl-browser',
      path: 'SKILL.md',
    });
    expect(readCloudlSkill('cloudl-browser/references/targets.md', '', root)).toMatchObject({
      skill: 'cloudl-browser',
      path: 'references/targets.md',
      content: '# Targets\n',
    });
    expect(readCloudlSkill('cloudl-browser', 'references/targets.md', root).content).toBe('# Targets\n');
  });

  it('rejects non-cloudl skills and path traversal', () => {
    const root = makePackageRoot();

    expect(() => readCloudlSkill('smart-search', '', root)).toThrow(ArgumentError);
    expect(() => readCloudlSkill('cloudl-browser/../smart-search/SKILL.md', '', root)).toThrow(ArgumentError);
    expect(() => readCloudlSkill('cloudl-browser', '../../package.json', root)).toThrow(ArgumentError);
  });
});
