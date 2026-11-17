/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definePrimitivePack, SURFACE_NAMES } from '@elastic/isomer-sdk';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { defineView } from '../registry';

import { createIsomerRuntime } from './index';
import {
  boldPrimitive,
  drawingRuntime,
  holderPrimitive,
  notePrimitive,
  packOf,
  primitiveNamed,
  snapshotPackOf,
  testFrame,
  view,
  type WrapNode,
  wrapPrimitive,
} from './runtime.fixtures';

describe('createIsomerRuntime', () => {
  it('generates authoring context from registered primitive definitions', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });
    const context = runtime.getAuthoringContext();

    expect(context.primitives).toHaveLength(1);
    expect(context.primitives[0]?.type).toBe('note');
    expect(context.schema.title).toBe('View');
  });

  it('hands an editor declarations and a body schema for the registered primitives', () => {
    const runtime = createIsomerRuntime({
      packs: [packOf(holderPrimitive, notePrimitive)],
    });
    const { declarations, bodySchema } = runtime.getAuthoringContext();

    expect(declarations).toContain('interface NoteNode {');
    expect(declarations).toContain(' * Render a compact note.');
    expect(declarations).toContain('type BodyNode =');
    expect(declarations).not.toContain('const');
    expect(bodySchema).toMatchObject({
      type: 'array',
      items: { $ref: '#/$defs/bodyNode' },
    });
  });

  it('declares the JSX components only when asked', () => {
    const jsx = createIsomerRuntime({
      packs: [packOf(notePrimitive)],
      authoring: { jsx: true },
    }).getAuthoringContext();

    expect(jsx.declarations).toContain(
      'const Note: (props: NoteProps) => null;'
    );
    expect(jsx.schema.title).toBe('View');
  });

  it('forwards the editor module identity', () => {
    const context = createIsomerRuntime({
      packs: [packOf(notePrimitive)],
      authoring: { jsx: true, moduleName: 'isomer:notes' },
    }).getAuthoringContext();
    expect(context.declarations).toContain('declare module "isomer:notes" {');
    expect(context.schema.title).toBe('View');
  });

  it('names a schemaFor container in the authoring JSON Schema', () => {
    const runtime = createIsomerRuntime({
      packs: [packOf(holderPrimitive, notePrimitive)],
    });
    const defs = (runtime.getAuthoringContext().schema.$defs ?? {}) as Record<
      string,
      { properties?: { child?: { $ref?: string } } }
    >;

    expect(defs.holder).toBeTypeOf('object');
    expect(defs.note).toBeTypeOf('object');
    expect(defs.bodyNode).toBeTypeOf('object');
    expect(defs.holder?.properties?.child).toEqual({
      $ref: '#/$defs/bodyNode',
    });
  });

  it("merges each pack's authoring options into the runtime schema", () => {
    const runtime = createIsomerRuntime({
      packs: [
        definePrimitivePack({
          id: 'test.a',
          surfaces: [],
          primitives: [notePrimitive],
          authoring: { describe: { note: 'A compact note.' } },
        }),
      ],
    });
    const schema = runtime.getAuthoringContext().schema as {
      $defs?: Record<string, { description?: string }>;
    };
    expect(schema.$defs?.note?.description).toBe('A compact note.');
  });

  it("lets the runtime-level authoring option override a pack's own", () => {
    const runtime = createIsomerRuntime({
      packs: [
        definePrimitivePack({
          id: 'test.a',
          surfaces: [],
          primitives: [notePrimitive],
          authoring: { describe: { note: 'from the pack' } },
        }),
      ],
      authoring: { describe: { note: 'from the runtime' } },
    });
    const schema = runtime.getAuthoringContext().schema as {
      $defs?: Record<string, { description?: string }>;
    };
    expect(schema.$defs?.note?.description).toBe('from the runtime');
  });

  it('builds a narrower schema for a subset of primitive types', () => {
    const runtime = createIsomerRuntime({
      packs: [packOf(notePrimitive, boldPrimitive)],
    });
    const schema = runtime.getAuthoringContext().schemaFor(['note']) as {
      $defs?: Record<string, unknown>;
    };
    expect(schema.$defs?.note).toBeTypeOf('object');
    expect(schema.$defs?.bold).toBeUndefined();
  });

  it('throws for an unknown type passed to schemaFor', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });
    expect(() => runtime.getAuthoringContext().schemaFor(['missing'])).toThrow(
      /unknown primitive type.*"missing"/
    );
  });

  it("collects every pack's groups in pack order", () => {
    const runtime = createIsomerRuntime({
      packs: [
        definePrimitivePack({
          id: 'test.a',
          primitives: [notePrimitive],
          authoring: { groups: [{ title: 'Text', types: ['note'] }] },
        }),
        definePrimitivePack({
          id: 'test.b',
          primitives: [holderPrimitive],
          authoring: { groups: [{ title: 'Layout', types: ['holder'] }] },
        }),
      ],
    });
    expect(runtime.getAuthoringContext().groups).toEqual([
      { title: 'Text', types: ['note'] },
      { title: 'Layout', types: ['holder'] },
    ]);
  });

  it('describes requested primitives with the defs they reach', () => {
    const runtime = createIsomerRuntime({
      packs: [packOf(holderPrimitive, notePrimitive, boldPrimitive)],
    });
    const { primitives, schema } = runtime
      .getAuthoringContext()
      .describePrimitives(['holder', 'holder']);

    expect(primitives.map(({ type }) => type)).toEqual(['holder']);
    expect(Object.keys(schema.$defs as object).sort()).toEqual([
      'bodyNode',
      'holder',
    ]);
  });

  it('describes the props of each requested type', () => {
    const runtime = createIsomerRuntime({
      packs: [packOf(holderPrimitive, notePrimitive)],
    });
    const { props } = runtime
      .getAuthoringContext()
      .describePrimitives(['note', 'holder', 'note']);

    expect(Object.keys(props)).toEqual(['note', 'holder']);
    expect(props.note).toEqual([
      {
        name: 'type',
        type: 'note',
        kind: 'enum',
        values: ['note'],
        required: true,
      },
      { name: 'text', type: 'string', kind: 'string', required: true },
    ]);
    expect(props.holder?.find(({ name }) => name === 'child')).toMatchObject({
      type: 'bodyNode',
      kind: 'other',
      required: true,
    });
  });

  it('throws for an unknown type passed to describePrimitives', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });
    expect(() =>
      runtime.getAuthoringContext().describePrimitives(['missing'])
    ).toThrow(/describePrimitives: unknown primitive type.*"missing"/);
  });

  it('aggregates registered views into the authoring context', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });

    // Nothing registered yet: primitives are there, views are not.
    expect(runtime.getAuthoringContext().views).toEqual([]);

    runtime.viewRegistry.register(
      defineView({
        id: 'test.hosts',
        title: 'Top hosts',
        answers: ['which hosts are noisy?'],
        input: z.object({ limit: z.number() }),
        build: ({ input }) => view(`limit ${input.limit}`),
      })
    );

    // Read live, so a view registered after construction is visible — a host
    // may register per request or from a user-supplied store.
    const context = runtime.getAuthoringContext();
    expect(context.views).toHaveLength(1);
    expect(context.views[0]?.id).toBe('test.hosts');
    expect(context.views[0]?.answers).toEqual(['which hosts are noisy?']);
    // The input schema an agent needs to request it, derived from the Zod one.
    expect(context.views[0]?.inputSchema).toMatchObject({ type: 'object' });
    // The primitive half is unchanged and still cached.
    expect(context.primitives.map((entry) => entry.type)).toEqual(['note']);
  });

  it('describes capabilities from registered primitive definitions', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });

    expect(runtime.getCapabilities()).toEqual({
      primitives: ['note'],
      surfaces: ['react', 'html', 'text', 'markdown', 'slack'],
      formats: ['react', 'html', 'text', 'markdown', 'slack'],
      support: {
        note: {
          react: 'native',
          html: 'native',
          text: 'native',
          markdown: 'native',
          slack: 'native',
        },
      },
    });
  });

  it('reports slack as fallback for a primitive without a slack renderer, whatever its pack declares', () => {
    const runtime = createIsomerRuntime({
      packs: [
        definePrimitivePack({
          id: 'declares-slack',
          surfaces: ['slack'],
          primitives: [notePrimitive, wrapPrimitive],
        }),
      ],
    });

    const { support } = runtime.getCapabilities();
    expect(support.note?.slack).toBe('native');
    expect(support.wrap?.slack).toBe('fallback');
    expect(support.wrap?.markdown).toBe('native');
    expect(
      runtime.surfaces.slack.renderNode({ type: 'wrap', items: [] } as WrapNode)
        .blocks
    ).toEqual([
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [{ type: 'text', text: 'wrap(0)' }],
          },
        ],
      },
    ]);
  });

  it('reports slack as native once a renderer override supplies one', () => {
    const runtime = createIsomerRuntime({
      packs: [packOf(wrapPrimitive)],
      rendererOverrides: {
        wrap: {
          slack: (): SlackBlock => ({ type: 'divider' }),
        },
      },
    });

    expect(runtime.getCapabilities().support.wrap?.slack).toBe('native');
  });

  it('reports snapshot support only when the runtime has a frame', () => {
    expect(
      createIsomerRuntime({ packs: [packOf(notePrimitive)] }).getCapabilities()
        .support.note
    ).not.toHaveProperty('snapshot');
    expect(
      drawingRuntime(notePrimitive).getCapabilities().support.note
    ).toEqual(expect.objectContaining({ snapshot: 'native' }));
  });

  it('lists authoring primitives in definition order', () => {
    const runtime = createIsomerRuntime({
      packs: [
        packOf(
          primitiveNamed('note'),
          primitiveNamed('actions'),
          primitiveNamed('later')
        ),
      ],
    });

    expect(
      runtime.getAuthoringContext().primitives.map((entry) => entry.type)
    ).toEqual(['note', 'actions', 'later']);
  });

  it('reports exactly the surfaces it built, and every one but snapshot as a format', () => {
    const withFrames = drawingRuntime(notePrimitive);
    const withoutFrames = createIsomerRuntime({
      packs: [packOf(notePrimitive)],
    });

    expect(withFrames.getCapabilities().surfaces).toEqual(
      Object.keys(withFrames.surfaces)
    );
    expect(withoutFrames.getCapabilities().surfaces).toEqual(
      Object.keys(withoutFrames.surfaces).filter((name) => name !== 'snapshot')
    );
    expect(withFrames.getCapabilities().surfaces).toEqual(
      expect.arrayContaining([...SURFACE_NAMES])
    );
    expect(withFrames.getCapabilities().formats).toEqual(
      Object.keys(withFrames.surfaces).filter((name) => name !== 'snapshot')
    );
  });

  it('reports the formats a host registers alongside its own', () => {
    const runtime = createIsomerRuntime({
      packs: [snapshotPackOf(notePrimitive)],
      frames: { card: testFrame },
      formats: ['png', 'svg', 'pdf'],
    });

    expect(runtime.getCapabilities().formats).toEqual([
      'react',
      'html',
      'text',
      'markdown',
      'slack',
      'png',
      'svg',
      'pdf',
    ]);
  });
});
