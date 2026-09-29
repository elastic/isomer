/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { buildAuthoringPrompt, formatPrimitiveEntry } from './prompt';

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
});

describe('the index catalog', () => {
  const entry = (type: string, purpose: string) => ({
    type,
    purpose,
    useWhen: ['Always.'],
    avoidWhen: [],
    example: { type },
  });
  const primitives = [
    entry('stat', 'One number.'),
    entry('quote', 'A pull\nquote.'),
    entry('note', 'A note.'),
    entry('table', 'Rows.'),
  ];

  it('lists each primitive under its group, and the rest under Other', () => {
    const prompt = buildAuthoringPrompt('general', {
      ...context,
      primitives,
      catalog: 'index',
      groups: [
        { title: 'Data', types: ['table', 'stat'] },
        { title: 'Text', types: ['quote'] },
      ],
    });
    expect(prompt).toContain(
      [
        '### Data\n\n- `table` — Rows.\n- `stat` — One number.',
        '### Text\n\n- `quote` — A pull quote.',
        '### Other\n\n- `note` — A note.',
      ].join('\n\n')
    );
    expect(prompt).toContain(
      'request its catalog entry and JSON Schema by type'
    );
    expect(prompt).not.toContain('Use when');
  });

  it('frames composing without a schema when none is given', () => {
    const prompt = buildAuthoringPrompt('compose-from-primitives', {
      guide: 'Guide',
      examples: [],
      primitives,
      catalog: 'index',
    });
    expect(prompt).not.toContain('JSON Schema before responding');
    expect(prompt).not.toContain('## JSON Schema');
  });
});

describe('formatPrimitiveEntry', () => {
  it('prints the full catalog bullet on one line per field', () => {
    const quote = {
      type: 'quote',
      purpose: 'A pull\n  quote.',
      useWhen: ['Someone said it.'],
      avoidWhen: ['It is\nlong.'],
      example: { type: 'quote' },
    };
    expect(formatPrimitiveEntry(quote)).toBe(
      [
        '- `quote` — A pull quote.',
        '  - Use when: Someone said it.',
        '  - Avoid when: It is long.',
        '  - Example: `{"type":"quote"}`',
      ].join('\n')
    );
    expect(
      buildAuthoringPrompt('general', { ...context, primitives: [quote] })
    ).toContain(formatPrimitiveEntry(quote));
  });
});
