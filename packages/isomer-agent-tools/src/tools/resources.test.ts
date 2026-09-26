/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDeckFrame, slidesPack } from '@elastic/isomer-primitives-slides';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { describe, expect, it } from 'vitest';

import {
  ISOMER_AUTHORING_GUIDE_URI,
  ISOMER_COMPOSE_PROMPT,
  ISOMER_COMPOSITION_SCHEMA_URI,
} from './names';
import { createIsomerPrompts } from './prompts';
import { createIsomerResources } from './resources';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

describe('createIsomerResources', () => {
  const resources = createIsomerResources({ runtime });
  const read = (uri: string) =>
    resources.find((resource) => resource.uri === uri)!;

  it('offers the guide and the schema', () => {
    expect(resources.map(({ uri }) => uri)).toEqual([
      ISOMER_AUTHORING_GUIDE_URI,
      ISOMER_COMPOSITION_SCHEMA_URI,
    ]);
  });

  it('reads the guide as markdown, without the schema', () => {
    const guide = read(ISOMER_AUTHORING_GUIDE_URI);
    expect(guide.mimeType).toBe('text/markdown');
    expect(guide.read()).toContain('## Primitive catalog');
    expect(guide.read()).not.toContain('## JSON Schema');
  });

  it('reads the whole composition schema as JSON', () => {
    const schema = JSON.parse(read(ISOMER_COMPOSITION_SCHEMA_URI).read()) as {
      $defs?: Record<string, unknown>;
    };
    expect(Object.keys(schema.$defs ?? {})).toEqual(
      expect.arrayContaining(['bodyNode', 'slideFrame', 'slideTimeline'])
    );
  });
});

describe('createIsomerPrompts', () => {
  const [compose] = createIsomerPrompts({ runtime });

  it('names the compose prompt', () => {
    expect(compose?.name).toBe(ISOMER_COMPOSE_PROMPT);
  });

  it('appends the request to the guide', () => {
    const args = compose!.argsSchema.parse({
      request: 'Summarize the launch.',
    });
    expect(compose!.build(args)).toMatch(
      /## Primitive catalog[\s\S]*## Request\n\nSummarize the launch\.$/
    );
  });

  it('is the guide alone without a request', () => {
    expect(compose!.build(compose!.argsSchema.parse({}))).not.toContain(
      '## Request'
    );
  });
});
