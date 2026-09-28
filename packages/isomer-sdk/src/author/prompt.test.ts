/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, expectTypeOf, it } from 'vitest';

import { oneLine } from './index';
import {
  buildAuthoringPrompt,
  createAgentAuthoringContextFactory,
  createAuthoringPromptBuilder,
} from './prompt';

const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

const context = {
  guide: 'Guide',
  schema: { type: 'object', properties: { title: { type: 'string' } } },
  primitives: [] as const,
  examples: [] as const,
};

describe('buildAuthoringPrompt', () => {
  it('defaults to view-facing copy', () => {
    const prompt = buildAuthoringPrompt('general', context);
    expect(prompt.startsWith('# View authoring')).toBe(true);
    expect(prompt).toContain('You author views:');
    expect(prompt).not.toContain('Adaptive UI');
  });

  it('uses caller-supplied heading and intro', () => {
    const prompt = buildAuthoringPrompt('general', {
      ...context,
      heading: '# host authoring',
      intro: 'Custom intro.',
    });
    expect(prompt.startsWith('# host authoring')).toBe(true);
    expect(prompt).toContain('Custom intro.');
  });

  it('minifies the JSON Schema', () => {
    const prompt = buildAuthoringPrompt('general', context);
    expect(prompt).toContain(
      '```json\n{"type":"object","properties":{"title":{"type":"string"}}}\n```'
    );
    expect(prompt).not.toContain('\n  "type"');
  });

  it('renders each catalog example under its bullet', () => {
    const prompt = buildAuthoringPrompt('general', {
      ...context,
      primitives: [
        {
          type: 'note',
          purpose: 'A compact note.',
          useWhen: ['The answer needs a line of prose.'],
          avoidWhen: ['A callout already carries the finding.'],
          example: { type: 'note', text: 'Hello' },
        },
      ],
    });
    expect(prompt).toContain('- `note` — A compact note.');
    expect(prompt).toContain('- Use when: The answer needs a line of prose.');
    expect(prompt).toContain(
      '- Avoid when: A callout already carries the finding.'
    );
    expect(prompt).toContain('- Example: `{"type":"note","text":"Hello"}`');
  });

  it('lists registered views', () => {
    const prompt = buildAuthoringPrompt('general', {
      ...context,
      views: [
        {
          id: 'test.hosts',
          title: 'Top hosts',
          description: 'Noisy hosts.',
          answers: ['which hosts are noisy?'],
          inputSchema: {
            type: 'object',
            properties: { limit: { type: 'number' } },
          },
        },
      ],
    });
    expect(prompt).toContain('## Registered views');
    expect(prompt).toContain('- `test.hosts` — Top hosts');
    expect(prompt).toContain('- Answers: which hosts are noisy?');
    expect(prompt).toContain(
      '- Input: `{"type":"object","properties":{"limit":{"type":"number"}}}`'
    );
  });

  it('omits the JSON Schema for the router profile', () => {
    const prompt = buildAuthoringPrompt('registered-view-router', context);
    expect(prompt).not.toContain('## JSON Schema');
    expect(prompt).toContain('## Primitive catalog');
  });

  it('omits the Rules heading when rules are absent', () => {
    const prompt = buildAuthoringPrompt('general', context);
    expect(prompt).not.toContain('## Rules');
  });

  it('strips meta from host-supplied examples and caps them', () => {
    const prompt = buildAuthoringPrompt('compose-from-primitives', {
      ...context,
      examples: [
        {
          type: 'view',
          body: [{ type: 'note', text: 'one' }],
          meta: { source: 'fixture' },
        },
        {
          type: 'view',
          body: [{ type: 'note', text: 'two' }],
        },
      ],
    });
    expect(prompt).toContain('"type":"view"');
    expect(prompt).toContain('"text":"one"');
    expect(prompt).not.toContain('fixture');
    expect(prompt).not.toContain('"text":"two"');
  });

  it('indexes primitives by type and purpose under their groups', () => {
    const entry = (type: string) => ({
      type,
      purpose: `The ${type}.`,
      useWhen: ['Always.'],
      avoidWhen: ['Never.'],
      example: { type },
    });
    const prompt = buildAuthoringPrompt('compose-from-primitives', {
      guide: 'Guide',
      primitives: [entry('a'), entry('b'), entry('c')],
      examples: [],
      catalog: 'index',
      groups: [{ title: 'Firsts', types: ['b', 'a'] }],
    });
    expect(prompt).toContain(
      '## Primitive catalog\n\n### Firsts\n\n- `b` — The b.\n- `a` — The a.\n\n### Other\n\n- `c` — The c.'
    );
    expect(prompt).not.toContain('Use when');
    expect(prompt).not.toContain('## JSON Schema');
    expect(prompt).not.toContain('against the JSON Schema');
  });

  it('indexes a catalog with no groups under Other, the same shape as a grouped one', () => {
    const prompt = buildAuthoringPrompt('compose-from-primitives', {
      guide: 'Guide',
      rules: '',
      examples: [],
      primitives: ['a', 'b'].map((type) => ({
        type,
        purpose: `The ${type}.`,
        useWhen: [],
        avoidWhen: [],
        example: { type },
      })),
      catalog: 'index',
    });
    expect(prompt).toContain(
      '## Primitive catalog\n\n### Other\n\n- `a` — The a.\n- `b` — The b.'
    );
  });

  it('passes catalog and groups through a prompt builder, with groups from its defaults', () => {
    const entry = (type: string) => ({
      type,
      purpose: `The ${type}.`,
      useWhen: ['Always.'],
      avoidWhen: ['Never.'],
      example: { type },
    });
    const build = createAuthoringPromptBuilder({
      guide: 'Guide',
      rules: '',
      schema: {},
      primitives: [entry('a'), entry('b')],
      groups: [{ title: 'Firsts', types: ['b'] }],
    });
    expect(build('compose-from-primitives', { catalog: 'index' })).toContain(
      '### Firsts\n\n- `b` — The b.\n\n### Other\n\n- `a` — The a.'
    );
  });

  it('keeps every index entry on one line, whatever its type and purpose hold', () => {
    const prompt = buildAuthoringPrompt('compose-from-primitives', {
      guide: 'Guide',
      primitives: [
        {
          type: 'odd`type',
          purpose: 'First line\n## Injected\r\nand more\u2028end',
          useWhen: [],
          avoidWhen: [],
          example: {},
        },
      ],
      examples: [],
      catalog: 'index',
      groups: [{ title: 'Group\n## Also injected', types: ['odd`type'] }],
    });
    expect(prompt).toContain(
      '### Group ## Also injected\n\n- ``odd`type`` — First line ## Injected and more end'
    );
    expect(prompt).not.toMatch(/^## Injected/m);
  });

  it('keeps every registered view field on one line', () => {
    const prompt = buildAuthoringPrompt('general', {
      ...context,
      views: [
        {
          id: 'odd`id\n## Injected id',
          title: 'Title\r\n## Injected title',
          description: `Description${LINE_SEPARATOR}## Injected description`,
          answers: ['first\n## Injected answer'],
          inputSchema: { description: 'has ` a backtick\n## Injected input' },
        },
      ],
    });
    expect(prompt).not.toMatch(/^## Injected/m);
    expect(prompt).not.toContain(LINE_SEPARATOR);
    expect(prompt).toContain(
      '- ``odd`id ## Injected id`` — Title ## Injected title'
    );
    expect(prompt).toContain(
      '- Input: ``{"description":"has ` a backtick\\n## Injected input"}``'
    );
  });

  it('escapes line and paragraph separators in example JSON rather than rewriting them', () => {
    const text = `a${LINE_SEPARATOR}b${PARAGRAPH_SEPARATOR}c`;
    const prompt = buildAuthoringPrompt('general', {
      ...context,
      primitives: [
        {
          type: 'note',
          purpose: 'A note.',
          useWhen: [],
          avoidWhen: [],
          example: { type: 'note', text },
        },
      ],
      examples: [{ type: 'view', body: [{ type: 'note', text }] }],
    });
    expect(prompt).not.toContain(LINE_SEPARATOR);
    expect(prompt).not.toContain(PARAGRAPH_SEPARATOR);
    expect(prompt).toContain(
      '- Example: `{"type":"note","text":"a\\u2028b\\u2029c"}`'
    );
    expect(prompt).toContain('"text":"a\\u2028b\\u2029c"}]}\n```');
  });

  it('drops the schema when a builder context sets it to undefined', () => {
    const build = createAuthoringPromptBuilder({
      guide: 'Guide',
      rules: '',
      schema: { type: 'object' },
      primitives: [],
    });
    expect(build('compose-from-primitives')).toContain('## JSON Schema');
    expect(
      build('compose-from-primitives', { catalog: 'index', schema: undefined })
    ).not.toContain('## JSON Schema');
  });

  it('takes catalog, heading and intro from a builder’s defaults', () => {
    const prompt = createAuthoringPromptBuilder({
      guide: 'Guide',
      rules: '',
      schema: {},
      primitives: [
        {
          type: 'a',
          purpose: 'The a.',
          useWhen: ['Always.'],
          avoidWhen: [],
          example: { type: 'a' },
        },
      ],
      catalog: 'index',
      heading: '# Pack authoring',
      intro: 'Pack intro.',
    })('general');
    expect(prompt.startsWith('# Pack authoring\n\nPack intro.')).toBe(true);
    expect(prompt).not.toContain('Use when');
  });
});

describe('createAgentAuthoringContextFactory', () => {
  it('returns the defaults’ schema, typed as present', () => {
    const schema = { type: 'object' };
    const context = createAgentAuthoringContextFactory({
      guide: 'Guide',
      rules: '',
      schema,
      primitives: [],
    })();
    expectTypeOf(context.schema).toEqualTypeOf<Record<string, unknown>>();
    expect(context.schema).toBe(schema);
  });
});

describe('oneLine', () => {
  it('replaces every line terminator with a space', () => {
    expect(
      oneLine(`a\nb\r\nc\rd${LINE_SEPARATOR}e${PARAGRAPH_SEPARATOR}f`)
    ).toBe('a b c d e f');
  });
});
