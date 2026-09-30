/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAuthoringJsonSchema } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { buildSlidesAuthoringPrompt } from './agent_guide';
import { slidesPackAuthoring } from './pack_authoring';
import { slideDeckPrimitives, slidePrimitiveTypes } from './registry';
import { commandMaxColumns } from './theme/components/command';
import { diffLineMaxLength } from './theme/components/diff';

describe('slides authoring prompt', () => {
  const prompt = buildSlidesAuthoringPrompt();

  it('lists every registered primitive in the catalog', () => {
    for (const type of slidePrimitiveTypes) {
      expect(prompt, type).toContain(`- \`${type}\` — `);
    }
  });

  it('names no primitive the pack does not register', () => {
    const named = new Set(prompt.match(/\bslide[A-Z]\w*/g));
    const registered = new Set<string>(slidePrimitiveTypes);
    const unknown = [...named].filter(
      (name) =>
        !registered.has(name) &&
        // Branded child items and `$def` names are not primitives.
        !['slideSplitPane', 'slideTerritory', 'slideTurn'].includes(name)
    );
    expect(unknown).toEqual([]);
  });

  it('carries real catalog copy for every primitive', () => {
    for (const { catalog } of slideDeckPrimitives) {
      expect(catalog.purpose, catalog.type).not.toMatch(/^Stub/);
      expect(catalog.useWhen.length, catalog.type).toBeGreaterThanOrEqual(2);
      expect(catalog.avoidWhen.length, catalog.type).toBeGreaterThanOrEqual(1);
    }
  });

  it('includes the guide, the rules, and the JSON Schema', () => {
    expect(prompt).toContain('# Slide authoring');
    expect(prompt).toContain('## Guide');
    expect(prompt).toContain('## Rules');
    expect(prompt).toContain('## JSON Schema');
  });
});

describe('slides authoring schema', () => {
  it('resolves every `$ref` to a def it holds', () => {
    const schema = buildAuthoringJsonSchema(
      slideDeckPrimitives,
      slidesPackAuthoring
    );
    const { $defs } = schema as { $defs: Record<string, unknown> };
    const refs = [...JSON.stringify(schema).matchAll(/"#\/\$defs\/([^"]+)"/g)];
    expect(refs.map(([, id]) => id).filter((id) => !(id! in $defs))).toEqual(
      []
    );
  });
});

describe('slides authoring schema restates each rule the JSON Schema drops', () => {
  const schema = JSON.stringify(
    buildAuthoringJsonSchema(slideDeckPrimitives, slidesPackAuthoring)
  );

  // One row per refinement: the error it reports, and the words the schema states it in.
  it.each([
    ['slideCommand', 'one line only', 'One shell command on one line'],
    ['slideCommand', 'not tabs', 'with spaces rather than tabs'],
    [
      'slideCommand',
      'wider than the slide',
      `It holds ${commandMaxColumns} columns on a full-width slide`,
    ],
    [
      'slideCommand',
      'highlightPrefix must start command',
      'Must be a prefix of `command`',
    ],
    [
      'slideDiff',
      'one line per entry',
      'Each entry in lines is one line of source',
    ],
    ['slideDiff', 'not tabs', 'indented with spaces rather than tabs'],
    [
      'slideDiff',
      'a line is wider than its panel',
      `A line holds ${diffLineMaxLength(false)} columns`,
    ],
    [
      'slideTranscript',
      'text is blank',
      'a turn of only blank lines is refused',
    ],
  ])('%s: %s', (_type, _error, stated) => {
    expect(schema).toContain(stated);
  });
});
