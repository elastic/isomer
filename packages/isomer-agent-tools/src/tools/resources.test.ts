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

describe('host options', () => {
  const example = { type: 'view', title: 'Host example', body: [] };
  const options = {
    runtime,
    guide: 'Write for the finance team.',
    rules: ['One idea per slide.'],
    examples: [example],
  };

  const guideOf = (profile?: 'registered-view-router') => {
    const withProfile =
      profile === undefined ? options : { ...options, profile };
    const resource = createIsomerResources(withProfile).find(
      ({ uri }) => uri === ISOMER_AUTHORING_GUIDE_URI
    )!;
    const [compose] = createIsomerPrompts(withProfile);
    return {
      resource: resource.read(),
      prompt: compose!.build(compose!.argsSchema.parse({})),
    };
  };

  it('reach the guide resource and the compose prompt alike', () => {
    const { resource, prompt } = guideOf();
    expect(prompt).toBe(resource);
    expect(resource).toContain('## Guide\n\nWrite for the finance team.');
    expect(resource).toContain('## Rules\n\n- One idea per slide.');
    expect(resource).toContain(
      `## Examples\n\n\`\`\`json\n${JSON.stringify(example)}\n\`\`\``
    );
  });

  it('frame the guide for the profile, which sets the example budget', () => {
    const { resource, prompt } = guideOf('registered-view-router');
    expect(prompt).toBe(resource);
    expect(resource).toContain('You route questions to registered views.');
    expect(resource).not.toContain('## Examples');
  });
});
