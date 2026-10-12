/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slidesPack } from '@elastic/isomer-primitives-slides';
import { createIsomerRuntime, defineView } from '@elastic/isomer-runtime';
import { describe, expect, it } from 'vitest';

import {
  ISOMER_AUTHORING_GUIDE_URI,
  ISOMER_COMPOSE_PROMPT,
  ISOMER_COMPOSITION_SCHEMA_URI,
  ISOMER_TOOL_NAMES,
} from './names';
import { createIsomerPrompts, createIsomerResources } from './resources';

const runtime = createIsomerRuntime({ packs: [slidesPack] });

describe('createIsomerResources', () => {
  const resources = createIsomerResources({ runtime });
  const byUri = (uri: string) =>
    resources.find((resource) => resource.uri === uri)!;

  it('offers the guide and the schema', () => {
    expect(resources.map(({ uri }) => uri)).toEqual([
      ISOMER_AUTHORING_GUIDE_URI,
      ISOMER_COMPOSITION_SCHEMA_URI,
    ]);
  });

  it('reads the guide as markdown, without the schema', () => {
    const guide = byUri(ISOMER_AUTHORING_GUIDE_URI);
    expect(guide.mimeType).toBe('text/markdown');
    expect(guide.read()).toContain('## Primitive catalog');
    expect(guide.read()).not.toContain('## JSON Schema');
  });

  it('reads a view registered after the resources were created', () => {
    const late = createIsomerRuntime({ packs: [slidesPack] });
    const [guide] = createIsomerResources({ runtime: late });
    const [compose] = createIsomerPrompts({ runtime: late });
    expect(guide!.read()).not.toContain('`late-view`');
    late.viewRegistry.register(
      defineView({
        id: 'late-view',
        title: 'Late view',
        answers: ['show a late view'],
        build: () => ({ type: 'view', body: [] }),
      })
    );
    expect(guide!.read()).toContain('`late-view`');
    expect(compose!.build({})).toContain('`late-view`');
  });

  it('reads the whole composition schema as compact JSON', () => {
    const schema = byUri(ISOMER_COMPOSITION_SCHEMA_URI);
    const text = schema.read();
    expect(text).not.toContain('\n');
    expect(JSON.parse(text)).toEqual(runtime.getAuthoringContext().schema);
    expect(schema.description).toContain(ISOMER_TOOL_NAMES.describePrimitives);
  });
});

describe('createIsomerPrompts', () => {
  const [compose] = createIsomerPrompts({ runtime });

  it('appends the request to the guide', () => {
    expect(compose?.name).toBe(ISOMER_COMPOSE_PROMPT);
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
    const [compose] = createIsomerPrompts(withProfile);
    return {
      resource: createIsomerResources(withProfile)[0]!.read(),
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
