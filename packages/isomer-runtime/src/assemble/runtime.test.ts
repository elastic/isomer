/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createElement,
  Fragment,
  type ReactElement,
  type ReactNode,
} from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  type AnyPrimitiveDefinition,
  type Composition,
  definePrimitive,
  definePrimitivePack,
  type Frame,
  type PrimitiveNode,
  type PrimitivePack,
  type StyleHandle,
  themeBound,
  unresolvedBodyNodeSchema,
} from '@elastic/isomer-sdk';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import { defineView } from '../registry';

import { createIsomerRuntime } from './index';

interface NoteNode extends PrimitiveNode {
  type: 'note';
  text: string;
}

const notePrimitive = definePrimitive<NoteNode>({
  type: 'note',
  catalog: {
    type: 'note',
    purpose: 'Render a compact note.',
    useWhen: ['A runtime needs a minimal text node.'],
    avoidWhen: ['The official primitive pack is available.'],
    example: { type: 'note', text: 'Hello' },
  },
  examples: [{ type: 'note', text: 'Hello' }],
  schema: z.object({
    type: z.literal('note'),
    text: z.string().min(1),
  }),
  renderers: {
    react: (node) => createElement('span', null, node.text),
    text: (node) => node.text,
    markdown: (node) => node.text,
    slack: (node): SlackBlock => ({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: node.text,
      },
    }),
  },
});

const view = (text: string) => ({
  type: 'view' as const,
  body: [{ type: 'note' as const, text }],
});

interface WrapNode extends PrimitiveNode {
  type: 'wrap';
  // Loosely typed on purpose: the point of this fixture is holding *another*
  // pack's node, which this package cannot name.
  items: (PrimitiveNode & Record<string, unknown>)[];
}

/** A container, so tests can nest one pack's node inside another's. */
const wrapPrimitive = definePrimitive<WrapNode>({
  type: 'wrap',
  catalog: {
    type: 'wrap',
    purpose: 'Group child nodes.',
    useWhen: ['A runtime needs a container for tree-walk fixtures.'],
    avoidWhen: ['The official primitive pack is available.'],
    example: { type: 'wrap', items: [] },
  },
  examples: [{ type: 'wrap', items: [] }],
  schema: z.object({
    type: z.literal('wrap'),
    items: z.array(z.looseObject({ type: z.string() })),
  }),
  children: (node) =>
    node.items.map((item, index) => ({
      node: item,
      path: `items[${index}]`,
    })),
  renderers: {
    react: (node, { context, scope }) =>
      createElement(
        'div',
        null,
        node.items.map((item, index) =>
          createElement(
            Fragment,
            { key: index },
            scope.renderReact(item, context)
          )
        )
      ),
    text: (node, { scope }) =>
      node.items.map((item) => scope.renderText(item)).join(','),
    markdown: (node) => `wrap(${node.items.length})`,
  },
});

interface HolderNode extends PrimitiveNode {
  type: 'holder';
  child: PrimitiveNode;
}

/** A `schemaFor` container, so authoring projection can name the composed member. */
const holderPrimitive = definePrimitive<HolderNode>({
  type: 'holder',
  catalog: {
    type: 'holder',
    purpose: 'Nest a child node.',
    useWhen: ['A runtime needs a recursive container for schema fixtures.'],
    avoidWhen: ['The official primitive pack is available.'],
    example: { type: 'holder', child: { type: 'note', text: 'Hello' } },
  },
  examples: [],
  schema: z.object({
    type: z.literal('holder'),
    child: unresolvedBodyNodeSchema,
  }),
  schemaFor: (bodyNodeSchema) =>
    z.object({ type: z.literal('holder'), child: bodyNodeSchema }),
  children: (node) => [{ node: node.child, path: 'child' }],
  renderers: {
    react: () => createElement('div'),
    text: () => 'holder',
    markdown: () => 'holder',
  },
});

interface BoldNode extends PrimitiveNode {
  type: 'bold';
  text: string;
}

const boldPrimitive = definePrimitive<BoldNode>({
  type: 'bold',
  catalog: {
    type: 'bold',
    purpose: 'Render bold text.',
    useWhen: ['A runtime needs a second minimal text node for fixtures.'],
    avoidWhen: ['The official primitive pack is available.'],
    example: { type: 'bold', text: 'Hello' },
  },
  examples: [{ type: 'bold', text: 'Hello' }],
  schema: z.object({
    type: z.literal('bold'),
    text: z.string().min(1),
  }),
  renderers: {
    react: (node) => createElement('strong', null, node.text),
    text: (node) => node.text,
    markdown: (node) => node.text,
  },
});

interface PlainNode extends PrimitiveNode {
  type: 'plain';
  text: string;
}

// A primitive from a pack that does not target images: no `svg` renderer.
const plainPrimitive = definePrimitive<PlainNode>({
  type: 'plain',
  catalog: {
    type: 'plain',
    purpose: 'Render text on the non-image surfaces only.',
    useWhen: ['A pack does not target SVG or PNG output.'],
    avoidWhen: ['The view must be rasterizable.'],
    example: { type: 'plain', text: 'Hello' },
  },
  examples: [{ type: 'plain', text: 'Hello' }],
  schema: z.object({
    type: z.literal('plain'),
    text: z.string().min(1),
  }),
  renderers: {
    react: (node) => createElement('span', null, node.text),
    text: (node) => node.text,
    markdown: (node) => node.text,
  },
});

// Stands in for a host's frame: records the viewport it was handed so the
// tests can assert what the surface resolved.
const testFrame: Frame<string> = {
  defaultWidth: 600,
  theme: { light: 'light-theme', dark: 'dark-theme' },
  // 40 per node plus whatever the primitive's own metrics report (`note` has
  // none, so it contributes 0).
  estimateHeight: (spec, dispatcher) =>
    spec.body.reduce(
      (sum, node) => sum + dispatcher.estimateSvgHeight(node) + 40,
      0
    ),
  wrap: (_spec, body, viewport) =>
    createElement(
      'svg',
      {
        width: viewport.width,
        height: viewport.height,
        theme: viewport.theme,
      },
      body
    ),
};

/** A pack declaring no optional surfaces and requiring nothing of a runtime's theme. */
const packOf = (
  ...primitives: readonly AnyPrimitiveDefinition[]
): PrimitivePack<unknown> =>
  definePrimitivePack({
    id: 'test',
    surfaces: [],
    primitives,
  });

/** A pack whose primitives all draw SVG. `themeBound<string>()` matches {@link testFrame}. */
const svgPackOf = (
  ...primitives: readonly AnyPrimitiveDefinition[]
): PrimitivePack<string> =>
  definePrimitivePack({
    id: 'test.drawing',
    primitives,
    theme: themeBound<string>(),
  });

/** Stands in for the slide frame: a fixed frame that never measures a node. */
const fixedFrame: Frame<string> = {
  ...testFrame,
  sizesFromNodeHeights: false,
  estimateHeight: () => 1080,
};

/**
 * A runtime that draws, since only a frame gives it an `svg` surface.
 *
 * Return type inferred rather than written as
 * `ReturnType<typeof createIsomerRuntime>`: that instantiates the type
 * parameters at their constraints, so `TTheme` lands on `unknown` — "supply
 * nothing" — which no frame-bearing runtime satisfies.
 */
const drawingRuntime = (...primitives: readonly AnyPrimitiveDefinition[]) =>
  createIsomerRuntime({
    packs: [svgPackOf(...primitives)],
    frames: { card: testFrame },
  });

describe('createIsomerRuntime', () => {
  it('requires at least one pack', () => {
    expect(() => createIsomerRuntime({ packs: [] })).toThrow(
      /at least one primitive pack is required/
    );
  });

  it('identifies pack admission failures by name and code', () => {
    try {
      createIsomerRuntime({ packs: [] });
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        name: 'IsomerError',
        code: 'EMPTY_PACKS',
      });
    }
  });

  it('requires at least one primitive in a pack', () => {
    expect(() =>
      definePrimitivePack({
        id: 'test.empty',
        surfaces: [],
        primitives: [],
      })
    ).toThrow(/at least one primitive is required/);
  });

  it('rejects a primitive type claimed by two packs', () => {
    expect(() =>
      createIsomerRuntime({
        packs: [
          packOf(notePrimitive),
          definePrimitivePack({
            id: 'test.other',
            surfaces: [],
            primitives: [notePrimitive],
          }),
        ],
      })
    ).toThrow(/primitive type "note" registered by "test" and "test.other"/);
  });

  it('validates and renders custom-only primitive definitions', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });
    const spec = view('Runtime owned');

    expect(runtime.validate(spec)).toMatchObject({ valid: true, errors: [] });
    expect(runtime.surfaces.text.render(spec)).toBe('Runtime owned');
    expect(runtime.surfaces.markdown.render(spec)).toContain('Runtime owned');
    expect(runtime.surfaces.slack.render(spec).blocks).toEqual([
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Runtime owned',
        },
      },
    ]);
  });

  it('exposes the same schema validate/parse use internally, memoized', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });
    const spec = view('Runtime owned');

    const schema = runtime.getCompositionSchema();
    expect(schema.safeParse(spec).success).toBe(true);
    expect(
      schema.safeParse({ type: 'view', body: [{ type: 'nope' }] }).success
    ).toBe(false);
    // Same instance every call: proves `getCompositionSchemaForDefinitions`'s
    // per-definitions-array memoization is actually being hit here, not just
    // present in the SDK.
    expect(runtime.getCompositionSchema()).toBe(schema);
  });

  it('parses an unknown value into a composition, reporting schema failures', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });

    const parsed = runtime.parse(
      JSON.parse('{"type":"view","body":[{"type":"note","text":"Wire"}]}')
    );
    expect(parsed).toMatchObject({ valid: true, errors: [] });
    expect(parsed.composition?.body).toEqual([{ type: 'note', text: 'Wire' }]);

    const rejected = runtime.parse({ type: 'view', body: [{ type: 'nope' }] });
    expect(rejected.valid).toBe(false);
    expect(rejected.composition).toBeUndefined();
    expect(rejected.errors.length).toBeGreaterThan(0);
  });

  it("uploads a pack's picture types as Slack images rather than markdown", () => {
    // A chart cannot be drawn in Block Kit, so with a collector present the
    // dispatcher swaps it for an image block and an upload request. Only the
    // pack knows which of its types are pictures, so a runtime that failed to
    // carry the declaration through would silently degrade every chart posted
    // to Slack into a markdown approximation.
    const runtime = createIsomerRuntime({
      packs: [
        definePrimitivePack({
          id: 'test.pictures',
          surfaces: [],
          primitives: [notePrimitive],
          slackAssetTypes: ['note'],
        }),
      ],
    });

    const result = runtime.surfaces.slack.render(view('Drawn'), {
      collectAssets: true,
    });

    expect(result.assets).toHaveLength(1);
    expect(result.blocks).toContainEqual(
      expect.objectContaining({ type: 'image' })
    );
  });

  it('renders a single node to Slack in the same shape as a composition', () => {
    const runtime = createIsomerRuntime({
      packs: [
        definePrimitivePack({
          id: 'test.pictures',
          surfaces: [],
          primitives: [notePrimitive],
          slackAssetTypes: ['note'],
        }),
      ],
    });
    const node = { type: 'note' as const, text: 'Drawn' };

    const degraded = runtime.surfaces.slack.renderNode(node);
    expect(degraded).toEqual({
      text: 'Drawn',
      blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Drawn' } }],
      assets: [],
    });

    const uploaded = runtime.surfaces.slack.renderNode(node, {
      collectAssets: true,
      assetPrefix: 'chart',
      text: 'A chart',
    });
    expect(uploaded.text).toBe('A chart');
    expect(uploaded.assets).toEqual([
      expect.objectContaining({ ref: 'chart-0', node }),
    ]);
    expect(uploaded.blocks).toEqual([
      expect.objectContaining({ type: 'image' }),
    ]);
  });

  it('derives validation from registered primitive schemas', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });

    expect(
      runtime.validate({
        type: 'view',
        body: [{ type: 'note' }],
      } as never)
    ).toMatchObject({ valid: false });
    expect(
      runtime.validate({
        type: 'view',
        body: [{ type: 'table', rows: [] }],
      } as never)
    ).toMatchObject({ valid: false });
  });

  it('applies renderer overrides to registered primitive types', () => {
    const runtime = createIsomerRuntime({
      packs: [packOf(notePrimitive)],
      rendererOverrides: {
        note: {
          text: (node: NoteNode) => `override:${node.text}`,
        },
      },
    });

    expect(runtime.surfaces.text.render(view('ok'))).toBe('override:ok');
  });

  // `react` serves the `svg` surface, so one override reaches both.
  it('accepts a react override that narrows the node type', () => {
    const runtime = createIsomerRuntime({
      packs: [svgPackOf(notePrimitive)],
      frames: { card: testFrame },
      rendererOverrides: {
        note: {
          react: (node: NoteNode) =>
            createElement('text', null, `svg:${node.text}`),
        },
      },
    });

    expectTypeOf(runtime.surfaces.svg).not.toEqualTypeOf<undefined>();
    expect(
      renderToStaticMarkup(runtime.surfaces.svg.render(view('ok')).element)
    ).toContain('svg:ok');
  });

  it('rejects renderer overrides for unknown primitive types', () => {
    expect(() =>
      createIsomerRuntime({
        packs: [packOf(notePrimitive)],
        rendererOverrides: {
          missing: {
            text: () => 'unused',
          },
        },
      })
    ).toThrow(/unregistered primitive type "missing"/);
  });

  it('rejects renderer overrides for unknown surfaces', () => {
    expect(() =>
      createIsomerRuntime({
        packs: [packOf(notePrimitive)],
        rendererOverrides: {
          note: {
            // A typo in a surface key would otherwise merge silently.
            txt: () => 'unused',
          } as Record<string, unknown>,
        },
      })
    ).toThrow(/targets unknown surface "txt"/);
  });

  it('generates authoring context from registered primitive definitions', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });
    const context = runtime.getAuthoringContext();

    expect(context.primitives).toHaveLength(1);
    expect(context.primitives[0]?.type).toBe('note');
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
      formats: ['react', 'html', 'text', 'markdown', 'slack'],
    });
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

  it('skips overrides for primitives the override map does not target', () => {
    const runtime = createIsomerRuntime({
      packs: [packOf(notePrimitive, boldPrimitive)],
      rendererOverrides: {
        note: { text: (node: NoteNode) => `override:${node.text}` },
      },
    });

    expect(runtime.surfaces.text.render(view('ok'))).toBe('override:ok');
    expect(
      runtime.surfaces.text.render({
        type: 'view',
        body: [{ type: 'bold', text: 'untouched' } as BoldNode],
      })
    ).toBe('untouched');
  });

  it('renders a view and a single node through the html surface', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });
    const spec = view('Runtime owned');

    const result = runtime.surfaces.html.render(spec);
    expect(result.body).toContain('Runtime owned');
    expect(result.html).toContain('aria-label="View"');

    const nodeResult = runtime.surfaces.html.renderNode({
      type: 'note',
      text: 'Node owned',
    } as NoteNode);
    expect(nodeResult.body).toContain('Node owned');
  });

  it('uses a host-supplied default aria-label', () => {
    const runtime = createIsomerRuntime({
      packs: [packOf(notePrimitive)],
      defaultAriaLabel: 'Host view',
    });

    expect(runtime.surfaces.html.render(view('ok')).html).toContain(
      'aria-label="Host view"'
    );
  });

  it('uses a supplied style adapter for the html surface', () => {
    const styleAdapter = {
      createCollector: () => ({ css: '.note { color: red; }' }),
      createRenderContext: () => ({}),
      renderStyles: (collector: { css: string }) => collector.css,
    };
    const runtime = createIsomerRuntime({
      packs: [packOf(notePrimitive)],
      styleAdapter,
    });

    const result = runtime.surfaces.html.render(view('Styled'));
    expect(result.css).toContain('.note { color: red; }');
  });

  it('honours a validation mode the style adapter derives', () => {
    // `resolveOptions` settles options before anything reads them, and the
    // validation gate is the earliest reader — resolving after it would let a
    // composition the adapter meant to reject render anyway.
    const styleAdapter = {
      createCollector: () => ({ css: '' }),
      createRenderContext: () => ({}),
      renderStyles: (collector: { css: string }) => collector.css,
      resolveOptions: (
        _composition: Composition,
        options: { framed?: boolean }
      ) => ({
        ...options,
        onValidationError: 'throw' as const,
      }),
    };
    const runtime = createIsomerRuntime({
      packs: [packOf(notePrimitive)],
      styleAdapter,
    });

    try {
      runtime.surfaces.html.render({
        type: 'view',
        body: [{ type: 'nope' }],
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        name: 'CompositionValidationError',
        code: 'COMPOSITION_INVALID',
      });
    }
  });

  // A host `styleAdapter` replaces every pack's own, so one collector serves
  // every pack and the document gets one `<style>`.
  it('routes all HTML CSS through the single style adapter across multiple packs', () => {
    const secondPack = definePrimitivePack({
      id: 'test.second',
      surfaces: [],
      primitives: [boldPrimitive],
    });
    const styleAdapter = {
      createCollector: () => ({ css: '.one-adapter { color: red; }' }),
      createRenderContext: () => ({}),
      renderStyles: (collector: { css: string }) => collector.css,
    };
    const runtime = createIsomerRuntime({
      packs: [packOf(notePrimitive), secondPack],
      styleAdapter,
    });

    const result = runtime.surfaces.html.render({
      type: 'view',
      body: [
        { type: 'note', text: 'a' } as NoteNode,
        { type: 'bold', text: 'b' } as BoldNode,
      ],
    });
    expect(result.css).toBe('.one-adapter { color: red; }');
  });

  it('emits no stylesheet when no style adapter is supplied', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });

    const result = runtime.surfaces.html.render(view('Unstyled'));
    expect(result.css).toBe('');
    expect(result.html).not.toContain('<style');
  });

  it('throws when a CSS-bearing pack has no styleAdapter', () => {
    const styledNote = definePrimitive<NoteNode>({
      type: 'note',
      catalog: notePrimitive.catalog,
      examples: notePrimitive.examples,
      schema: notePrimitive.schema,
      renderers: notePrimitive.renderers,
      collectStyles: () => undefined,
    });

    try {
      createIsomerRuntime({ packs: [packOf(styledNote)] });
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        name: 'IsomerError',
        code: 'MISSING_STYLE_ADAPTER',
      });
      expect((error as Error).message).toMatch(
        /pack "test" primitive "note" declares collectStyles/
      );
    }
  });

  it('throws when a pack collects into a different collector than the adapter creates', () => {
    const styledNote = definePrimitive<NoteNode>({
      type: 'note',
      catalog: notePrimitive.catalog,
      examples: notePrimitive.examples,
      schema: notePrimitive.schema,
      renderers: notePrimitive.renderers,
      collectStyles: () => undefined,
    });
    const pack = definePrimitivePack({
      id: 'test',
      surfaces: [],
      primitives: [styledNote],
      styleCollector: 'distillate',
    });

    try {
      createIsomerRuntime({
        packs: [pack],
        styleAdapter: {
          styleCollector: 'emotion',
          createCollector: () => ({}),
          createRenderContext: () => ({}),
          renderStyles: () => '',
        },
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        name: 'IsomerError',
        code: 'INCOMPATIBLE_STYLE_COLLECTOR',
      });
      expect((error as Error).message).toMatch(
        /pack "test" primitive "note" collects styles into a "distillate" collector/
      );
    }
  });

  it('accepts a CSS-bearing pack whose collector matches the adapter', () => {
    const styledNote = definePrimitive<NoteNode>({
      type: 'note',
      catalog: notePrimitive.catalog,
      examples: notePrimitive.examples,
      schema: notePrimitive.schema,
      renderers: notePrimitive.renderers,
      collectStyles: () => undefined,
    });
    const pack = definePrimitivePack({
      id: 'test',
      surfaces: [],
      primitives: [styledNote],
      styleCollector: 'distillate',
    });

    const runtime = createIsomerRuntime({
      packs: [pack],
      styleAdapter: {
        styleCollector: 'distillate',
        createCollector: () => ({}),
        createRenderContext: () => ({}),
        renderStyles: () => '',
      },
    });

    expect(runtime.surfaces.html.render(view('Styled')).css).toBe('');
  });

  it('leaves an undeclared collector unchecked, so an untagged pack still composes', () => {
    const styledNote = definePrimitive<NoteNode>({
      type: 'note',
      catalog: notePrimitive.catalog,
      examples: notePrimitive.examples,
      schema: notePrimitive.schema,
      renderers: notePrimitive.renderers,
      collectStyles: () => undefined,
    });

    const runtime = createIsomerRuntime({
      packs: [packOf(styledNote)],
      styleAdapter: {
        styleCollector: 'emotion',
        createCollector: () => ({}),
        createRenderContext: () => ({}),
        renderStyles: () => '',
      },
    });

    expect(runtime.surfaces.html.render(view('Styled')).css).toBe('');
  });

  it('accepts a CSS-bearing pack when a no-op style adapter is supplied', () => {
    const styledNote = definePrimitive<NoteNode>({
      type: 'note',
      catalog: notePrimitive.catalog,
      examples: notePrimitive.examples,
      schema: notePrimitive.schema,
      renderers: notePrimitive.renderers,
      collectStyles: () => undefined,
    });
    const runtime = createIsomerRuntime({
      packs: [packOf(styledNote)],
      styleAdapter: {
        createCollector: () => ({}),
        createRenderContext: () => ({}),
        renderStyles: () => '',
      },
    });

    const result = runtime.surfaces.html.render(view('Unstyled'));
    expect(result.css).toBe('');
  });

  it('uses a pack-declared styleAdapter when the host omits one', () => {
    const pack = definePrimitivePack({
      id: 'test.pack-css',
      surfaces: [],
      primitives: [notePrimitive],
      styleAdapter: {
        createCollector: () => ({ css: '.from-pack { color: blue; }' }),
        createRenderContext: () => ({}),
        renderStyles: (collector: { css: string }) => collector.css,
      },
    });
    const runtime = createIsomerRuntime({ packs: [pack] });

    expect(runtime.surfaces.html.render(view('Styled')).css).toContain(
      '.from-pack { color: blue; }'
    );
  });

  it('lets the host styleAdapter override the pack default', () => {
    const pack = definePrimitivePack({
      id: 'test.pack-css',
      surfaces: [],
      primitives: [notePrimitive],
      styleAdapter: {
        createCollector: () => ({ css: '.from-pack { color: blue; }' }),
        createRenderContext: () => ({}),
        renderStyles: (collector: { css: string }) => collector.css,
      },
    });
    const runtime = createIsomerRuntime({
      packs: [pack],
      styleAdapter: {
        createCollector: () => ({ css: '.from-host { color: red; }' }),
        createRenderContext: () => ({}),
        renderStyles: (collector: { css: string }) => collector.css,
      },
    });

    expect(runtime.surfaces.html.render(view('Styled')).css).toContain(
      '.from-host { color: red; }'
    );
  });

  // A host loading two styled packs should not have to know how either one
  // produces CSS. Each adapter owns its own handles, so the runtime routes
  // rather than asking the host to pick.
  describe('two packs each declaring a styleAdapter', () => {
    /** Stands in for one Distillate distillery: collects only the handles it owns. */
    const scopedAdapter = (prefix: string) => ({
      ownsHandle: (handle: StyleHandle) => handle.key.startsWith(prefix),
      createCollector: () => ({ keys: [] as string[] }),
      createRenderContext: (collector: { keys: string[] }) => ({
        resolveClassName: (...handles: StyleHandle[]) => {
          collector.keys.push(...handles.map(({ key }) => key));
          return handles.map(({ key }) => key).join(' ');
        },
      }),
      renderStyles: (collector: { keys: string[] }) =>
        collector.keys.map((key) => `.${key}{}`).join(''),
    });

    const styledPacks = (
      firstAdapter: unknown = scopedAdapter('one.'),
      secondAdapter: unknown = scopedAdapter('two.')
    ) => [
      definePrimitivePack({
        id: 'test.one',
        surfaces: [],
        primitives: [notePrimitive],
        styleAdapter: firstAdapter as never,
      }),
      definePrimitivePack({
        id: 'test.two',
        surfaces: [],
        primitives: [boldPrimitive],
        styleAdapter: secondAdapter as never,
      }),
    ];

    it('constructs without a host styleAdapter', () => {
      const runtime = createIsomerRuntime({ packs: styledPacks() });

      expect(runtime.surfaces.html.render(view('ok')).css).toBe('');
    });

    it('emits both stylesheets, routing each handle to its owner', () => {
      const first = scopedAdapter('one.');
      const second = scopedAdapter('two.');
      const runtime = createIsomerRuntime({
        packs: styledPacks(first, second),
        rendererOverrides: {
          note: {
            react: (node, { context }) => {
              const { resolveClassName } = context as {
                resolveClassName?: (...handles: StyleHandle[]) => string;
              };
              return createElement(
                'span',
                {
                  className: resolveClassName?.(
                    { key: 'one.root', readableName: 'one-root' },
                    { key: 'two.root', readableName: 'two-root' }
                  ),
                },
                (node as NoteNode).text
              );
            },
          },
        },
      });

      const result = runtime.surfaces.html.render(view('ok'));
      expect(result.body).toContain('class="one.root two.root"');
      expect(result.css).toBe('.one.root{}.two.root{}');
    });

    it('throws when a pack adapter cannot say which handles it owns', () => {
      const opaque = {
        createCollector: () => ({}),
        createRenderContext: () => ({}),
        renderStyles: () => '',
      };

      try {
        createIsomerRuntime({
          packs: styledPacks(scopedAdapter('one.'), opaque),
        });
        expect.unreachable();
      } catch (error) {
        expect(error).toMatchObject({
          name: 'IsomerError',
          code: 'AMBIGUOUS_STYLE_ADAPTER',
        });
        expect((error as Error).message).toContain('"test.two"');
      }
    });

    // Each pack answers only to its own adapter here, because the composite
    // routes a pack's types to the part its adapter declared. Different
    // collectors are therefore fine — the packs never share one.
    it('accepts two packs collecting into different collectors', () => {
      const styledNote = definePrimitive<NoteNode>({
        type: 'note',
        catalog: notePrimitive.catalog,
        examples: notePrimitive.examples,
        schema: notePrimitive.schema,
        renderers: notePrimitive.renderers,
        collectStyles: () => undefined,
      });

      const runtime = createIsomerRuntime({
        packs: [
          definePrimitivePack({
            id: 'test.one',
            surfaces: [],
            primitives: [styledNote],
            styleAdapter: {
              ...scopedAdapter('one.'),
              styleCollector: 'distillate',
            },
            styleCollector: 'distillate',
          }),
          definePrimitivePack({
            id: 'test.two',
            surfaces: [],
            primitives: [boldPrimitive],
            styleAdapter: {
              ...scopedAdapter('two.'),
              styleCollector: 'emotion',
            },
            styleCollector: 'emotion',
          }),
        ],
      });

      expect(runtime.surfaces.html.render(view('ok')).css).toBe('');
    });

    // A pack with no adapter of its own has no part to be routed to, so every
    // adapter in the composite can reach its hooks — and each must agree.
    it('throws when an adapterless pack disagrees with a pack adapter', () => {
      const styledBold = definePrimitive<BoldNode>({
        type: 'bold',
        catalog: boldPrimitive.catalog,
        examples: boldPrimitive.examples,
        schema: boldPrimitive.schema,
        renderers: boldPrimitive.renderers,
        collectStyles: () => undefined,
      });

      try {
        createIsomerRuntime({
          packs: [
            definePrimitivePack({
              id: 'test.one',
              surfaces: [],
              primitives: [notePrimitive],
              styleAdapter: {
                ...scopedAdapter('one.'),
                styleCollector: 'distillate',
              },
            }),
            definePrimitivePack({
              id: 'test.two',
              surfaces: [],
              primitives: [styledBold],
              styleCollector: 'emotion',
            }),
          ],
        });
        expect.unreachable();
      } catch (error) {
        expect(error).toMatchObject({
          name: 'IsomerError',
          code: 'INCOMPATIBLE_STYLE_COLLECTOR',
        });
        expect((error as Error).message).toContain(
          '"test.one"\'s styleAdapter'
        );
      }
    });

    // Regression: each part's adapter walks the whole body, so an unfiltered
    // dispatcher ran pack B's hook against pack A's collector — B's rules
    // landed in A's stylesheet and `renderStyles` emitted them under both.
    it('collects each pack into its own part only', () => {
      const collectingAdapter = (prefix: string) => ({
        ...scopedAdapter(prefix),
        collectViewStyles: (
          composition: { body: readonly PrimitiveNode[] },
          dispatcher: {
            collectStyles: (
              node: PrimitiveNode,
              collector: { keys: string[] },
              context: Record<string, never>
            ) => void;
          },
          collector: { keys: string[] }
        ) => {
          for (const node of composition.body) {
            dispatcher.collectStyles(node, collector, {});
          }
        },
      });
      const collectingNote = definePrimitive<NoteNode>({
        type: 'note',
        catalog: notePrimitive.catalog,
        examples: notePrimitive.examples,
        schema: notePrimitive.schema,
        renderers: notePrimitive.renderers,
        collectStyles: (_node, { styles }) => {
          (styles as { keys: string[] }).keys.push('note');
        },
      });
      const collectingBold = definePrimitive<BoldNode>({
        type: 'bold',
        catalog: boldPrimitive.catalog,
        examples: boldPrimitive.examples,
        schema: boldPrimitive.schema,
        renderers: boldPrimitive.renderers,
        collectStyles: (_node, { styles }) => {
          (styles as { keys: string[] }).keys.push('bold');
        },
      });

      const runtime = createIsomerRuntime({
        packs: [
          definePrimitivePack({
            id: 'test.one',
            surfaces: [],
            primitives: [collectingNote],
            styleAdapter: collectingAdapter('one.'),
          }),
          definePrimitivePack({
            id: 'test.two',
            surfaces: [],
            primitives: [collectingBold],
            styleAdapter: collectingAdapter('two.'),
          }),
        ],
      });

      // One `note` and one `bold`: each type is collected once, by its own
      // pack's adapter, so neither key appears in both stylesheets.
      const result = runtime.surfaces.html.render({
        type: 'view' as const,
        body: [
          { type: 'note', text: 'n' } as NoteNode,
          { type: 'bold', text: 'b' } as BoldNode,
        ],
      });
      expect(result.css).toBe('.note{}.bold{}');
    });

    it('lets one host adapter replace both pack adapters', () => {
      const runtime = createIsomerRuntime({
        packs: styledPacks(),
        styleAdapter: {
          createCollector: () => ({ css: '.chosen {}' }),
          createRenderContext: () => ({}),
          renderStyles: (collector: { css: string }) => collector.css,
        },
      });

      expect(runtime.surfaces.html.render(view('ok')).css).toBe('.chosen {}');
    });

    it('resolves a handle no pack adapter owns through every part', () => {
      const taggingAdapter = (prefix: string) => ({
        ...scopedAdapter(prefix),
        createRenderContext: (collector: { keys: string[] }) => ({
          resolveClassName: (...handles: StyleHandle[]) => {
            collector.keys.push(...handles.map(({ key }) => key));
            return handles.map(({ key }) => `${prefix}${key}`).join(' ');
          },
        }),
      });
      const classedPlain = definePrimitive<PlainNode>({
        type: 'plain',
        catalog: plainPrimitive.catalog,
        examples: plainPrimitive.examples,
        schema: plainPrimitive.schema,
        renderers: {
          ...plainPrimitive.renderers,
          react: (node, { context }) => {
            const { resolveClassName } = context as {
              resolveClassName?: (...handles: StyleHandle[]) => string;
            };
            return createElement(
              'span',
              {
                className: resolveClassName?.({
                  key: 'shared',
                  readableName: 'shared',
                }),
              },
              node.text
            );
          },
        },
      });
      const runtime = createIsomerRuntime({
        packs: [
          ...styledPacks(taggingAdapter('one.'), taggingAdapter('two.')),
          definePrimitivePack({
            id: 'test.three',
            surfaces: [],
            primitives: [classedPlain],
          }),
        ],
      });

      const result = runtime.surfaces.html.render({
        type: 'view',
        body: [{ type: 'plain', text: 'p' } as PlainNode],
      });
      expect(result.body).toContain('class="one.shared two.shared"');
      expect(result.css).toBe('.shared{}.shared{}');
    });
  });

  it('accepts a primitive with no svg renderer', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(plainPrimitive)] });
    const spec = {
      type: 'view' as const,
      body: [{ type: 'plain' as const, text: 'no image' }],
    };

    // `svg` is optional in the contract, so the pack is valid and every
    // mandatory surface still renders.
    expect(runtime.validate(spec)).toMatchObject({ valid: true, errors: [] });
    expect(runtime.surfaces.text.render(spec)).toBe('no image');
    expect(runtime.surfaces.markdown.render(spec)).toContain('no image');
  });

  it('reports a duplicate id nested under a container whose child path has no .node suffix', () => {
    // `wrap`'s own path fragment is `items[0]`, not the `.node`-suffixed shape
    // `row` and `dashboardGrid` happen to share — this is what would keep
    // passing if a collector went back to assuming that suffix rather than
    // joining whatever path the container actually reports.
    const runtime = createIsomerRuntime({
      packs: [packOf(notePrimitive, wrapPrimitive)],
    });

    const errors = runtime.validate({
      type: 'view',
      body: [
        { type: 'note', id: 'dup', text: 'first' } as NoteNode,
        {
          type: 'wrap',
          items: [{ type: 'note', id: 'dup', text: 'second' }],
        } as WrapNode,
      ],
    }).errors;

    expect(errors).toContainEqual({
      path: 'body[1].items[0].id',
      message: 'duplicates id "dup" first used at body[0]',
    });
  });

  it('warns when a node renders to svg but declares no height metric', () => {
    // `bold` declares no `metrics.svgHeight`, so the dispatcher measures it as
    // 0 and this frame sizes the document short.
    const runtime = drawingRuntime(boldPrimitive);

    expect(
      runtime.validate({
        type: 'view',
        body: [{ type: 'bold', text: 'short' } as BoldNode],
      }).warnings
    ).toContainEqual({
      surface: 'svg',
      path: 'body[0]',
      message:
        'body[0] type "bold" declares no svgHeight metric and will be measured as 0, sizing the frame short',
    });
  });

  it('warns for a nested node with no height metric, using the container-derived path', () => {
    const runtime = drawingRuntime(boldPrimitive, wrapPrimitive);

    const warnings = runtime.validate({
      type: 'view',
      body: [
        {
          type: 'wrap',
          items: [{ type: 'bold', text: 'short' }],
        } as WrapNode,
      ],
    }).warnings;

    // Same guard as the missing-renderer case above, for the height warning.
    expect(warnings).toContainEqual({
      surface: 'svg',
      path: 'body[0].items[0]',
      message:
        'body[0].items[0] type "bold" declares no svgHeight metric and will be measured as 0, sizing the frame short',
    });
  });

  it('stays quiet about height metrics when no frame measures nodes', () => {
    // The slide case: a fixed 1920x1080 frame never consults the metric, so
    // demanding it would report nine warnings per spec for a value nothing
    // reads — which is how a warning channel gets tuned out.
    const runtime = createIsomerRuntime({
      packs: [svgPackOf(boldPrimitive)],
      frames: { slide: fixedFrame },
    });

    const warnings =
      runtime.validate({
        type: 'view',
        body: [{ type: 'bold', text: 'short' } as BoldNode],
      }).warnings ?? [];

    expect(warnings.map((warning) => warning.message)).not.toContainEqual(
      expect.stringContaining('svgHeight')
    );
  });

  it('has no svg surface, and reports no svg format, without a frame', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });

    expectTypeOf(runtime.surfaces.svg).toEqualTypeOf<undefined>();
    expect(runtime.surfaces.svg).toBeUndefined();
    expect(runtime.getCapabilities().formats).not.toContain('svg');
  });

  it('renders a view and a single node through the runtime frame', () => {
    const runtime = drawingRuntime(notePrimitive);

    const rendered = runtime.surfaces.svg.render(view('Framed'), {
      theme: 'dark',
    });
    const element = rendered.element as ReactElement<{
      width: number;
      height: number;
      theme: string;
      children: ReactNode;
    }>;

    // Width and height come from the frame's own defaults and estimate.
    expect(rendered.width).toBe(600);
    expect(rendered.height).toBe(40);
    expect(element.props.width).toBe(600);
    expect(element.props.height).toBe(40);
    expect(element.props.theme).toBe('dark-theme');
    expect(renderToStaticMarkup(element)).toContain('Framed');

    const node = runtime.surfaces.svg.renderNode({
      type: 'note',
      text: 'Bare',
    } as NoteNode);
    expect(renderToStaticMarkup(node.element)).toContain('Bare');
  });

  it('honours width and height overrides on the svg surface', () => {
    const runtime = drawingRuntime(notePrimitive);
    const spec = view('Sized');

    expect(
      runtime.surfaces.svg.resolveViewport(spec, { width: 800, height: 120 })
    ).toEqual({ width: 800, height: 120 });
    expect(runtime.surfaces.svg.resolveViewport(spec, { width: 800 })).toEqual({
      width: 800,
      height: 40,
    });

    const rendered = runtime.surfaces.svg.render(spec, {
      width: 800,
      height: 120,
    });
    const element = rendered.element as ReactElement<{
      width: number;
      height: number;
    }>;
    expect(rendered).toMatchObject({ width: 800, height: 120 });
    expect(element.props).toMatchObject({ width: 800, height: 120 });
  });

  it('emits rules a style adapter discovers while the svg surface renders', () => {
    const styleAdapter = {
      createCollector: () => ({ rules: [] as string[] }),
      resolveOptions: (
        _composition: Composition,
        options: { fluid?: boolean }
      ) => ({ ...options, fluid: true }),
      collectWrapperStyles: (collector: { rules: string[] }) => {
        collector.rules.push('.isomer{}');
      },
      collectViewStyles: (
        _composition: Composition,
        _dispatcher: unknown,
        collector: { rules: string[] },
        context: { fluid?: boolean }
      ) => {
        collector.rules.push(context.fluid ? '.fluid{}' : '.fixed{}');
      },
      createRenderContext: () => ({}),
      collectAfterRender: (
        _composition: Composition,
        collector: { rules: string[] }
      ) => {
        collector.rules.push('.after{}');
      },
      renderStyles: (collector: { rules: string[] }) =>
        collector.rules.join(''),
    };
    const runtime = createIsomerRuntime({
      packs: [svgPackOf(notePrimitive)],
      frames: { card: testFrame },
      styleAdapter,
    });

    expect(runtime.surfaces.svg.render(view('Styled')).css).toBe(
      '.isomer{}.fluid{}.after{}'
    );
    expect(
      runtime.surfaces.svg.renderNode({ type: 'note', text: 'n' } as NoteNode)
        .css
    ).toBe('.isomer{}.fluid{}.after{}');
  });

  it("hands a primitive the frame's resolved theme as env.theme", () => {
    interface SwatchNode extends PrimitiveNode {
      type: 'swatch';
    }
    const swatchPrimitive = definePrimitive<SwatchNode>({
      type: 'swatch',
      catalog: {
        type: 'swatch',
        purpose: 'Show the resolved theme.',
        useWhen: [],
        avoidWhen: [],
        example: { type: 'swatch' },
      },
      examples: [{ type: 'swatch' }],
      schema: z.object({ type: z.literal('swatch') }),
      renderers: {
        react: (_node, { theme }) => createElement('span', null, String(theme)),
        text: () => '',
        markdown: () => '',
      },
    });
    const runtime = drawingRuntime(swatchPrimitive);

    const dark = runtime.surfaces.svg.renderNode(
      { type: 'swatch' },
      { theme: 'dark' }
    );
    expect(renderToStaticMarkup(dark.element)).toContain('dark-theme');

    const light = runtime.surfaces.svg.renderNode({
      type: 'swatch',
    });
    expect(renderToStaticMarkup(light.element)).toContain('light-theme');
  });

  it('draws one pack of nodes under whichever frame the render names', () => {
    // The inversion, stated as a test: vocabulary composes, frame is chosen.
    // The same body renders at either width, and neither pack has an opinion.
    const runtime = createIsomerRuntime({
      packs: [svgPackOf(notePrimitive, boldPrimitive)],
      frames: {
        card: testFrame,
        wide: { ...testFrame, defaultWidth: 1920 },
      },
      defaultFrame: 'card',
    });
    const mixed: Composition = {
      type: 'view',
      body: [
        { type: 'note', text: 'narrow' } as NoteNode,
        { type: 'bold', text: 'wide' } as BoldNode,
      ],
    };

    expect(runtime.surfaces.svg?.resolveViewport(mixed).width).toBe(600);
    expect(
      runtime.surfaces.svg?.resolveViewport(mixed, { frame: 'wide' }).width
    ).toBe(1920);
  });

  it('rejects a frame name inherited from Object.prototype', () => {
    // `frame` is caller-supplied, so a truthiness check on the record would
    // treat `'constructor'` as a frame and fail later as a `TypeError` about
    // something unrelated.
    expect(() =>
      createIsomerRuntime({
        packs: [svgPackOf(notePrimitive)],
        frames: { card: testFrame },
        defaultFrame: 'constructor',
      })
    ).toThrow(/defaultFrame "constructor" is not one of the supplied frames/);

    const runtime = drawingRuntime(notePrimitive);
    expect(() =>
      runtime.surfaces.svg?.render(view('Framed'), { frame: 'toString' })
    ).toThrow(/no frame named "toString"/);
  });

  it('requires defaultFrame when more than one frame is supplied', () => {
    expect(() =>
      createIsomerRuntime({
        packs: [svgPackOf(notePrimitive)],
        frames: { card: testFrame, slide: fixedFrame },
      })
    ).toThrow(/defaultFrame is required/);
  });

  it('builds the svg surface for a frame named by the empty string', () => {
    // Degenerate but legal: `''` is a record key like any other, and a
    // truthiness check on the resolved default would drop the surface here
    // while every other part of the configuration reported itself as valid.
    const runtime = createIsomerRuntime({
      packs: [svgPackOf(notePrimitive)],
      frames: { '': testFrame },
    });

    expect(runtime.surfaces.svg?.resolveViewport(view('Framed')).width).toBe(
      600
    );
    expect(runtime.getCapabilities().formats).toContain('svg');
  });

  it('rejects a render naming a frame it does not hold', () => {
    const runtime = drawingRuntime(notePrimitive);

    expect(() =>
      runtime.surfaces.svg?.render(view('Framed'), { frame: 'nope' })
    ).toThrow(/no frame named "nope"/);
  });

  it("refuses a body the frame's own rule rejects", () => {
    const runtime = createIsomerRuntime({
      packs: [svgPackOf(notePrimitive)],
      frames: {
        single: {
          ...testFrame,
          validateBody: (body) =>
            body.length === 1 ? [] : ['needs exactly one node'],
        },
      },
    });

    expect(() =>
      runtime.surfaces.svg?.render({
        type: 'view',
        body: [
          { type: 'note', text: 'one' } as NoteNode,
          { type: 'note', text: 'two' } as NoteNode,
        ],
      })
    ).toThrow(
      /frame "single" cannot draw this composition: needs exactly one node/
    );
  });

  it('reports the registered name when one frame is aliased under two keys', () => {
    const rejecting: Frame<string> = {
      ...testFrame,
      validateBody: () => ['rejected'],
    };
    const runtime = createIsomerRuntime({
      packs: [svgPackOf(notePrimitive)],
      frames: { card: rejecting, slide: rejecting },
      defaultFrame: 'card',
    });
    const composition: Composition = {
      type: 'view',
      body: [{ type: 'note', text: 'one' } as NoteNode],
    };

    expect(() => runtime.surfaces.svg?.render(composition)).toThrow(
      /frame "card" cannot draw this composition: rejected/
    );
    expect(() =>
      runtime.surfaces.svg?.render(composition, { frame: 'slide' })
    ).toThrow(/frame "slide" cannot draw this composition: rejected/);
  });

  it('draws with a host palette in place of the frame default', () => {
    // Branding is a spread now rather than an override mechanism: frame is an
    // ordinary value the host owns, so there is nothing to reopen.
    const runtime = createIsomerRuntime({
      packs: [svgPackOf(notePrimitive)],
      frames: {
        card: {
          ...testFrame,
          theme: { light: 'brand-light', dark: 'brand-dark' },
        },
      },
    });

    const rendered = runtime.surfaces.svg.render(view('themed'))
      .element as ReactElement<{ theme: string }>;
    expect(rendered.props.theme).toBe('brand-light');
  });

  it('draws a host frame around the generically dispatched body', () => {
    // A frame replaces only the surround. The body inside it comes from the
    // runtime's dispatcher either way, so a host frame cannot change what a
    // spec contains.
    const runtime = createIsomerRuntime({
      packs: [svgPackOf(notePrimitive)],
      frames: {
        card: {
          ...testFrame,
          wrap: (spec, body, viewport) =>
            createElement(
              'host-frame',
              { title: spec.title, theme: viewport.theme },
              body
            ),
        },
      },
    });

    const rendered = runtime.surfaces.svg.render(view('framed'))
      .element as ReactElement<{ title?: string; theme: string }>;

    expect(rendered.type).toBe('host-frame');
    expect(rendered.props.theme).toBe('light-theme');
    expect(renderToStaticMarkup(rendered)).toContain('framed');
  });

  it('hands a frame the spec metadata without the body nodes', () => {
    // A frame that could read `body` could branch on a pack's node types, which
    // is the knowledge this split keeps out of the frame. Withholding it has to
    // happen at runtime — narrowing the parameter type alone would leave the
    // property reachable. `type` is absent for the same reason: the value is
    // built field by field rather than spread.
    let seen: object | undefined;
    const runtime = createIsomerRuntime({
      packs: [svgPackOf(notePrimitive)],
      frames: {
        card: {
          ...testFrame,
          wrap: (spec, body) => {
            seen = spec;
            return createElement('host-frame', null, body);
          },
        },
      },
    });

    runtime.surfaces.svg?.render({
      ...view('framed'),
      title: 'Quarterly',
    });

    expect(seen).toEqual({ title: 'Quarterly' });
    expect(Object.keys(seen!).sort()).toEqual(['subtitle', 'theme', 'title']);
  });

  it('keeps geometry with the frame a host reframes', () => {
    const runtime = createIsomerRuntime({
      packs: [svgPackOf(notePrimitive)],
      frames: {
        card: {
          ...testFrame,
          wrap: (_spec, body) => createElement('host-frame', null, body),
        },
      },
    });

    // 600 from `testFrame.defaultWidth`, 40 from its per-node estimate: a
    // replaced frame is drawn within a viewport the frame still sizes.
    expect(runtime.surfaces.svg?.resolveViewport(view('framed'))).toEqual({
      width: 600,
      height: 40,
    });
  });

  it('allows a pack to declare slack without every primitive implementing it', () => {
    // Slack degrades through the markdown fallback, so declaring it is not a
    // promise that every primitive has a native renderer.
    expect(() =>
      definePrimitivePack({
        id: 'test.slack',
        surfaces: ['slack'],
        primitives: [notePrimitive, boldPrimitive],
      })
    ).not.toThrow();
  });

  it('rejects the same enhancement id owned by two packs', () => {
    const enhancement = {
      id: 'tableSort',
      appliesTo: () => false,
      script: '',
    };
    expect(() =>
      createIsomerRuntime({
        packs: [
          definePrimitivePack({
            id: 'a',
            surfaces: [],
            primitives: [notePrimitive],
            enhancements: [enhancement],
          }),
          definePrimitivePack({
            id: 'b',
            surfaces: [],
            primitives: [boldPrimitive],
            enhancements: [enhancement],
          }),
        ],
      })
    ).toThrow('enhancement "tableSort" registered by "a" and "b"');
  });

  it('rejects the same primitive type owned by two packs', () => {
    expect(() =>
      createIsomerRuntime({
        packs: [packOf(notePrimitive), svgPackOf(notePrimitive)],
      })
    ).toThrow('primitive type "note" registered by "test" and "test.drawing"');
  });

  it('draws two packs of nodes into one image', () => {
    // Two vocabularies drawn under one frame.
    const runtime = createIsomerRuntime({
      packs: [
        definePrimitivePack({
          id: 'test.first',
          primitives: [notePrimitive],
        }),
        definePrimitivePack({
          id: 'test.second',
          primitives: [boldPrimitive],
        }),
      ],
      frames: { card: testFrame },
    });
    const mixed: Composition = {
      type: 'view',
      body: [
        { type: 'note', text: 'from one pack' } as NoteNode,
        { type: 'bold', text: 'from another' } as BoldNode,
      ],
    };

    expect(runtime.validate(mixed)).toMatchObject({ valid: true });
    const markup = renderToStaticMarkup(
      runtime.surfaces.svg.render(mixed).element
    );
    expect(markup).toContain('from one pack');
    expect(markup).toContain('from another');
  });

  it('renders a nested node owned by another pack', () => {
    const runtime = createIsomerRuntime({
      packs: [
        definePrimitivePack({
          id: 'test.wrap',
          surfaces: [],
          primitives: [wrapPrimitive],
        }),
        definePrimitivePack({
          id: 'test.bold',
          surfaces: [],
          primitives: [boldPrimitive],
        }),
      ],
    });
    const mixed: Composition = {
      type: 'view',
      body: [
        {
          type: 'wrap',
          items: [{ type: 'bold', text: 'nested' }],
        } as WrapNode,
      ],
    };

    expect(runtime.validate(mixed)).toMatchObject({ valid: true });
    expect(runtime.surfaces.text.render(mixed)).toBe('nested');
    expect(
      renderToStaticMarkup(runtime.surfaces.react.render(mixed))
    ).toContain('<strong>nested</strong>');
    expect(
      renderToStaticMarkup(
        runtime.surfaces.react.renderNode(mixed.body[0] as WrapNode)
      )
    ).toContain('<strong>nested</strong>');
  });

  it('react surface returns bare content without wrapper options', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });
    const markup = renderToStaticMarkup(
      runtime.surfaces.react.render(view('Bare'))
    );
    expect(markup).not.toContain('isomer');
  });

  it('react surface wraps content in the same section html emits, on request', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });
    const markup = renderToStaticMarkup(
      runtime.surfaces.react.render(view('Wrapped'), {
        wrapper: { fluid: true },
      })
    );
    expect(markup).toContain('class="isomer framed fluid"');
    expect(markup).toContain('role="group"');

    const unframed = renderToStaticMarkup(
      runtime.surfaces.react.render(view('Unframed'), {
        wrapper: { framed: false, theme: 'dark' },
      })
    );
    expect(unframed).toContain('class="isomer"');
    expect(unframed).toContain('data-theme="dark"');

    const defaults = renderToStaticMarkup(
      runtime.surfaces.react.render(view('Defaults'), { wrapper: true })
    );
    expect(defaults).toContain('class="isomer framed"');
    expect(defaults).not.toContain('data-theme');
  });

  it('react surface wrapper falls back to the runtime default aria-label', () => {
    const runtime = createIsomerRuntime({
      packs: [packOf(notePrimitive)],
      defaultAriaLabel: 'Host view',
    });

    expect(
      renderToStaticMarkup(
        runtime.surfaces.react.render(view('Labelled'), { wrapper: true })
      )
    ).toContain('aria-label="Host view"');
    expect(
      renderToStaticMarkup(
        runtime.surfaces.react.renderNode(
          { type: 'note', text: 'Node' } as NoteNode,
          { wrapper: true }
        )
      )
    ).toContain('aria-label="Host view"');
    expect(
      renderToStaticMarkup(
        runtime.surfaces.react.render(view('Overridden'), {
          wrapper: { defaultAriaLabel: 'Per render' },
        })
      )
    ).toContain('aria-label="Per render"');
  });

  it('react surface hands its context to a renderer', () => {
    interface GreetingContext {
      greeting: string;
    }
    const greetingNote = definePrimitive<NoteNode>({
      type: 'note',
      catalog: notePrimitive.catalog,
      examples: notePrimitive.examples,
      schema: notePrimitive.schema,
      renderers: {
        ...notePrimitive.renderers,
        react: (node, { context }) =>
          createElement(
            'span',
            null,
            `${(context as GreetingContext).greeting}, ${node.text}`
          ),
      },
    });
    const runtime = createIsomerRuntime<unknown, GreetingContext>({
      packs: [packOf(greetingNote)],
    });

    expect(
      renderToStaticMarkup(
        runtime.surfaces.react.render(view('world'), {
          context: { greeting: 'Hello' },
        })
      )
    ).toContain('Hello, world');
    expect(
      renderToStaticMarkup(
        runtime.surfaces.react.renderNode(
          { type: 'note', text: 'node' } as NoteNode,
          { context: { greeting: 'Hi' } }
        )
      )
    ).toContain('Hi, node');
  });

  it('html-renders a nested node owned by another pack', () => {
    const runtime = createIsomerRuntime({
      packs: [
        definePrimitivePack({
          id: 'test.wrap',
          surfaces: [],
          primitives: [wrapPrimitive],
        }),
        definePrimitivePack({
          id: 'test.bold',
          surfaces: [],
          primitives: [boldPrimitive],
        }),
      ],
    });
    const mixed: Composition = {
      type: 'view',
      body: [
        {
          type: 'wrap',
          items: [{ type: 'bold', text: 'nested' }],
        } as WrapNode,
      ],
    };

    expect(runtime.validate(mixed)).toMatchObject({ valid: true });
    expect(runtime.surfaces.html.render(mixed).html).toContain(
      '<strong>nested</strong>'
    );
  });

  it('reports an ordinary bad node against its own type', () => {
    // The body keeps its discriminated union, so a malformed node is reported
    // against its own `type` rather than against every branch.
    const runtime = drawingRuntime(notePrimitive, boldPrimitive);

    const errors = runtime.validate({
      type: 'view',
      body: [{ type: 'note' }],
    }).errors;

    expect(errors).toEqual([{ path: 'body[0].text', message: 'is required' }]);
  });

  it('composes a drawing pack with a pack that renders no svg', () => {
    // The validator still warns per node that the frameless pack's nodes will
    // be absent from an image, but the spec itself is fine.
    const runtime = createIsomerRuntime({
      packs: [svgPackOf(notePrimitive), packOf(plainPrimitive)],
      frames: { card: testFrame },
    });

    expect(
      runtime.validate({
        type: 'view',
        body: [
          { type: 'note', text: 'drawn' } as NoteNode,
          { type: 'plain', text: 'not drawn' } as PlainNode,
        ],
      })
    ).toMatchObject({ valid: true });
  });

  it('reports svg as a format once the host supplies a frame', () => {
    const runtime = drawingRuntime(notePrimitive);

    expect(runtime.getCapabilities().formats).toContain('svg');
  });

  it('enforces validation on the svg surface', () => {
    const runtime = drawingRuntime(notePrimitive);

    expect(() =>
      runtime.surfaces.svg?.render(
        { type: 'view', body: [{ type: 'note', text: '' } as NoteNode] },
        { onValidationError: 'throw' }
      )
    ).toThrow();
  });

  it('throws on an invalid composition by default everywhere but html and react', () => {
    const runtime = drawingRuntime(notePrimitive);
    const invalid: Composition = {
      type: 'view',
      body: [{ type: 'note', text: '' } as NoteNode],
    };
    const thrown = (render: () => unknown): unknown => {
      try {
        render();
      } catch (error) {
        return error;
      }
      return undefined;
    };
    const invalidComposition = {
      name: 'CompositionValidationError',
      code: 'COMPOSITION_INVALID',
    };

    expect(thrown(() => runtime.surfaces.text.render(invalid))).toMatchObject(
      invalidComposition
    );
    expect(
      thrown(() => runtime.surfaces.markdown.render(invalid))
    ).toMatchObject(invalidComposition);
    expect(thrown(() => runtime.surfaces.slack.render(invalid))).toMatchObject(
      invalidComposition
    );
    expect(thrown(() => runtime.surfaces.svg?.render(invalid))).toMatchObject(
      invalidComposition
    );
    expect(runtime.surfaces.html.render(invalid).validationErrors).not.toEqual(
      []
    );
    expect(
      runtime.surfaces.text.render(invalid, { onValidationError: 'collect' })
    ).toBeTypeOf('string');
  });

  it('registers, lists, and requests views through the runtime view registry', async () => {
    const runtime = createIsomerRuntime({
      packs: [packOf(notePrimitive)],
      views: [
        defineView({
          id: 'test.note-view',
          title: 'Note view',
          description: 'A registered note view.',
          answers: ['Show a note'],
          input: z.object({ text: z.string() }),
          build: ({ input }) => view(input.text),
        }),
      ],
    });

    expect(runtime.viewRegistry.list()).toEqual([
      expect.objectContaining({ id: 'test.note-view', title: 'Note view' }),
    ]);
    expect(runtime.viewRegistry.get('test.note-view')).toMatchObject({
      id: 'test.note-view',
    });

    const response = await runtime.viewRegistry.request(
      'test.note-view',
      undefined,
      { text: 'From registry' }
    );
    expect(response.validation).toMatchObject({ valid: true });
    expect(response.composition.body).toEqual([
      { type: 'note', text: 'From registry' },
    ]);

    await expect(
      runtime.viewRegistry.request('test.note-view', undefined, {
        text: 42,
      })
    ).rejects.toMatchObject({
      name: 'RegisteredViewInputError',
      code: 'VIEW_INPUT_INVALID',
    });

    expect(() =>
      runtime.viewRegistry.register({
        id: 'test.note-view',
        title: 'Duplicate',
        description: 'Duplicate registration.',
        answers: ['x'],
        build: () => view('duplicate'),
      })
    ).toThrow('View "test.note-view" is already registered');

    await expect(
      runtime.viewRegistry.request('test.missing-view', undefined)
    ).rejects.toThrow('Unknown view "test.missing-view"');
  });

  it('passes raw input through for views without a schema', async () => {
    const runtime = createIsomerRuntime({
      packs: [packOf(notePrimitive)],
      views: [
        {
          id: 'test.untyped-view',
          title: 'Untyped view',
          description: 'A view without an input schema.',
          answers: ['Show untyped view'],
          build: ({ input }) => view(JSON.stringify(input)),
        },
      ],
    });

    const response = await runtime.viewRegistry.request(
      'test.untyped-view',
      undefined,
      { anything: true }
    );
    expect(response.composition.body).toEqual([
      { type: 'note', text: JSON.stringify({ anything: true }) },
    ]);
  });

  it('rejects a frame whose palette does not satisfy the packs', () => {
    const numberFrame: Frame<number> = {
      defaultWidth: 1,
      theme: { light: 1, dark: 2 },
      estimateHeight: () => 1,
      wrap: () => null,
    };
    // @ts-expect-error Frame<number> does not satisfy PrimitivePack<string>.
    createIsomerRuntime({
      packs: [svgPackOf(notePrimitive)],
      frames: { card: numberFrame },
    });
  });
});

const primitiveNamed = (type: string) =>
  definePrimitive({
    type,
    catalog: {
      type,
      purpose: 'Order fixture.',
      useWhen: [],
      avoidWhen: [],
      example: { type, text: type },
    },
    examples: [{ type, text: type }],
    schema: z.object({
      type: z.string(),
      text: z.string(),
    }),
    renderers: {
      react: () => null,
      text: () => type,
      markdown: () => type,
    },
  });
