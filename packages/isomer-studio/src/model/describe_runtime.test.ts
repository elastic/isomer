/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import { definePrimitivePack } from '@elastic/isomer-sdk';

import {
  componentsAuthoring,
  componentsPack,
  componentsPrimitives,
} from '../fixtures/components_pack';

import { describeRuntime, humanize, runtimeSurfaces } from './describe_runtime';
import { searchPrimitives } from './search';

const runtime = createIsomerRuntime<unknown, StyledRenderContext>({
  packs: [componentsPack],
});
const docs = describeRuntime(runtime);
const docFor = (type: string) => {
  const doc = docs.primitives.find((primitive) => primitive.type === type);
  if (!doc) {
    throw new Error(`No doc for ${type}.`);
  }
  return doc;
};

describe('humanize', () => {
  it('splits camel case into a sentence-case label', () => {
    expect(humanize('statGroup')).toBe('Stat group');
    expect(humanize('callout')).toBe('Callout');
  });
});

describe('describeRuntime', () => {
  it('lists every primitive under its catalog group, sorted by label', () => {
    expect(docs.groups).toEqual([
      { title: 'Narrative and content', types: ['callout', 'divider'] },
      { title: 'Data display', types: ['health', 'statGroup'] },
    ]);
    expect(docs.primitives.map(({ type }) => type).sort()).toEqual([
      'callout',
      'divider',
      'health',
      'statGroup',
    ]);
  });

  it('sorts within a group by label and puts ungrouped primitives under Other', () => {
    const unsorted = definePrimitivePack({
      id: 'unsorted-pack',
      primitives: componentsPrimitives,
      authoring: {
        groups: [
          { title: 'Mixed', types: ['statGroup', 'divider', 'callout'] },
        ],
      },
    });
    const sorted = describeRuntime(
      createIsomerRuntime<unknown, StyledRenderContext>({ packs: [unsorted] })
    );

    expect(sorted.groups).toEqual([
      { title: 'Mixed', types: ['callout', 'divider', 'statGroup'] },
      { title: 'Other', types: ['health'] },
    ]);
  });

  it('carries the catalog purpose and guidance', () => {
    const { label, group, purpose, useWhen, avoidWhen } = docFor('callout');
    expect(label).toBe('Callout');
    expect(group).toBe('Narrative and content');
    expect(purpose).not.toBe('');
    expect(useWhen.length).toBeGreaterThan(0);
    expect(avoidWhen.length).toBeGreaterThan(0);
  });

  it('labels a primitive by its catalog name when it has one', () => {
    const namedPack = definePrimitivePack({
      id: 'named-pack',
      primitives: componentsPrimitives.map((definition) =>
        definition.type === 'callout'
          ? {
              ...definition,
              catalog: { ...definition.catalog, name: 'Banner' },
            }
          : definition
      ),
    });
    const named = describeRuntime(
      createIsomerRuntime<unknown, StyledRenderContext>({ packs: [namedPack] })
    );

    expect(named.primitives.find(({ type }) => type === 'callout')?.label).toBe(
      'Banner'
    );
    expect(
      named.primitives.find(({ type }) => type === 'statGroup')?.label
    ).toBe('Stat group');
  });

  it('describes props from the JSON Schema, resolving enum refs', () => {
    const props = new Map(
      docFor('callout').props.map((prop) => [prop.name, prop])
    );
    expect(props.get('body')).toMatchObject({
      type: 'string',
      kind: 'string',
      required: true,
    });
    expect(props.get('tone')).toMatchObject({ kind: 'enum', required: false });
    expect(props.get('tone')?.values).toEqual(
      expect.arrayContaining(['warning', 'danger'])
    );
  });

  it('describes array props', () => {
    const stats = docFor('statGroup').props.find(
      ({ name }) => name === 'stats'
    );
    expect(stats).toMatchObject({ kind: 'array', required: true });
  });

  it('names each example', () => {
    const { examples } = docFor('callout');
    expect(examples.length).toBeGreaterThan(1);
    expect(examples[0]?.name).toMatch(/^Example 1/);
    examples.forEach(({ node }) => expect(node.type).toBe('callout'));
  });

  it('reports runtime surfaces, adding Slack only per primitive renderer', () => {
    const surfaces = runtimeSurfaces(runtime);
    expect(surfaces).toEqual(
      expect.arrayContaining(['react', 'html', 'markdown', 'text'])
    );
    expect(surfaces).not.toContain('snapshot');
    docs.primitives.forEach(({ surfaces: supported, definition }) => {
      expect(supported.includes('slack')).toBe(
        Boolean(definition.renderers.slack)
      );
    });
  });

  it('leaves out a fallback surface even when the pack declares it', () => {
    const slackPack = definePrimitivePack({
      id: 'slack-pack',
      surfaces: ['slack'],
      primitives: componentsPrimitives,
      authoring: componentsAuthoring,
    });
    const slackRuntime = createIsomerRuntime<unknown, StyledRenderContext>({
      packs: [slackPack],
    });
    const health = describeRuntime(slackRuntime).primitives.find(
      ({ type }) => type === 'health'
    );

    expect(slackRuntime.getCapabilities().support.health?.slack).toBe(
      'fallback'
    );
    expect(health?.surfaces).not.toContain('slack');
  });
});

describe('searchPrimitives', () => {
  it('returns everything for an empty query', () => {
    expect(searchPrimitives(docs.primitives, '  ')).toHaveLength(
      docs.primitives.length
    );
  });

  it('matches names before descriptions', () => {
    const [first] = searchPrimitives(docs.primitives, 'stat');
    expect(first?.type).toBe('statGroup');
  });

  it('requires every word to match', () => {
    expect(searchPrimitives(docs.primitives, 'callout zzzz')).toEqual([]);
  });
});
