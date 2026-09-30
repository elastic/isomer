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
        !['slideSplitPane', 'slideTerritory'].includes(name)
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

// `z.toJSONSchema` drops refinements, so each flow primitive's cross-field rules are restated in its own description.
describe('slides authoring schema restates the flow primitives’ cross-field rules', () => {
  const { $defs = {} } = buildAuthoringJsonSchema(
    slideDeckPrimitives,
    slidesPackAuthoring
  ) as { $defs?: Record<string, { description?: string }> };

  it.each([
    ['slidePipeline', 'from ≤ to < steps.length'],
    ['slidePipeline', 'spans do not overlap'],
    ['slidePipeline', 'no start or end'],
    ['slidePipeline', 'and no size'],
    ['slidePipeline', 'chips with no body'],
    ['slideSequence', 'Actor ids are unique'],
    [
      'slideSequence',
      'every message names two different actors by id in from and to',
    ],
    ['slideSequence', 'every actor sends or receives at least one message'],
    ['slideLayers', 'Each layer has exactly one of body or chips'],
  ])('%s: %s', (type, stated) => {
    expect($defs[type]?.description).toContain(stated);
  });
});
