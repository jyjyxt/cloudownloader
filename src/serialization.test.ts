import { describe, expect, it } from 'vitest';
import type { CliCommand } from './registry.js';
import { Strategy } from './registry.js';
import { formatCommandExample, formatRegistryHelpText, serializeCommand } from './serialization.js';

describe('formatRegistryHelpText', () => {
  it('renders upstream adapter examples with the fork command without changing their arguments', () => {
    const cmd: CliCommand = {
      site: 'demo', name: 'search', access: 'read', description: 'Search',
      strategy: Strategy.PUBLIC, browser: false, args: [],
      example: '  cloudl demo search "cloudl docs" -f json  ',
    };
    expect(formatCommandExample(cmd)).toBe('cloudl demo search "cloudl docs" -f json');
    expect(serializeCommand(cmd).example).toBe('cloudl demo search "cloudl docs" -f json');
    expect(cmd.example).toBe('  cloudl demo search "cloudl docs" -f json  ');
  });

  it('summarizes long choices lists so help text stays readable', () => {
    const cmd: CliCommand = {
      site: 'demo',
      name: 'dynamic', access: 'read',
      description: 'Demo command',
      strategy: Strategy.PUBLIC,
      browser: false,
      args: [
        {
          name: 'field',
          help: 'Field to use',
          choices: ['all-fields', 'topic', 'title', 'author', 'publication-titles', 'year-published', 'doi'],
        },
      ],
      columns: ['field'],
    };

    expect(formatRegistryHelpText(cmd)).toContain('--field: all-fields, topic, title, author, ... (+3 more)');
  });

  it('includes aliases in structured serialization and help text', () => {
    const cmd: CliCommand = {
      site: 'demo',
      name: 'get',
      access: 'read',
      aliases: ['metadata'],
      description: 'Demo command',
      strategy: Strategy.COOKIE,
      browser: true,
      args: [],
    };

    expect(serializeCommand(cmd)).toMatchObject({
      command: 'demo/get',
      access: 'read',
      aliases: ['metadata'],
    });
    expect(formatRegistryHelpText(cmd)).toContain('Aliases: metadata');
  });

  it('surfaces access and canonical examples instead of strategy as primary help metadata', () => {
    const cmd: CliCommand = {
      site: 'bilibili',
      name: 'hot',
      access: 'read',
      description: 'Bilibili hot videos',
      strategy: Strategy.COOKIE,
      browser: true,
      args: [],
    };

    expect(formatCommandExample(cmd)).toBe('cloudl bilibili hot -f yaml');
    expect(serializeCommand(cmd)).toMatchObject({
      command: 'bilibili/hot',
      access: 'read',
      example: 'cloudl bilibili hot -f yaml',
    });
    expect(formatRegistryHelpText(cmd)).toContain('Access: read');
    expect(formatRegistryHelpText(cmd)).toContain('Example: cloudl bilibili hot -f yaml');
    expect(formatRegistryHelpText(cmd)).not.toContain('Strategy:');
  });

  it('surfaces command default output format in structured serialization and help text', () => {
    const cmd: CliCommand = {
      site: 'gemini',
      name: 'ask',
      access: 'read',
      description: 'Ask Gemini',
      strategy: Strategy.COOKIE,
      browser: true,
      args: [],
      defaultFormat: 'plain',
    };

    expect(serializeCommand(cmd)).toMatchObject({
      command: 'gemini/ask',
      defaultFormat: 'plain',
    });
    expect(formatRegistryHelpText(cmd)).toContain('Default format: plain');
  });
});
