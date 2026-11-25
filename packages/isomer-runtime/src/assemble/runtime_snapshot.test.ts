/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  type Composition,
  definePrimitive,
  definePrimitivePack,
  type Frame,
  layoutWidthOf,
  nodeAnchor,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import type { HTMLRenderOptions } from '@elastic/isomer-sdk/html';
import { md } from '@elastic/isomer-sdk/markdown';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import { createIsomerRuntime } from './index';
import {
  type BoldNode,
  boldPrimitive,
  drawingRuntime,
  fixedFrame,
  type NoteNode,
  notePrimitive,
  packOf,
  type PlainNode,
  plainPrimitive,
  snapshotPackOf,
  testFrame,
  view,
  type WrapNode,
  wrapPrimitive,
} from './runtime.fixtures';

describe('createIsomerRuntime', () => {
  it('reports a missing height from the frame a render measures with', () => {
    // `bold` declares no `metrics.snapshotHeight`, so the measuring frame sizes it
    // as 0. `validate` stays quiet: the same composition can be drawn into the
    // fixed frame, which never reads the metric.
    const runtime = createIsomerRuntime({
      packs: [snapshotPackOf(boldPrimitive)],
      frames: { card: testFrame, slide: fixedFrame },
      defaultFrame: 'slide',
    });
    const bold = { type: 'bold' as const, text: 'short' };
    const spec = {
      type: 'view' as const,
      body: [bold],
    };
    const missing = {
      path: 'body[0]',
      message:
        'body[0] type "bold" declares no snapshotHeight metric and will be measured as 0, sizing the frame short',
    };

    expect(
      runtime.validate(spec).warnings?.map((warning) => warning.message)
    ).not.toEqual(
      expect.arrayContaining([expect.stringContaining('snapshotHeight')])
    );
    expect(runtime.surfaces.snapshot.render(spec).warnings).toEqual([]);
    expect(
      runtime.surfaces.snapshot.render(spec, { frame: 'card' }).warnings
    ).toEqual([missing]);
    expect(
      runtime.surfaces.snapshot.render(spec, { frame: 'card', height: 10 })
        .warnings
    ).toEqual([]);
    expect(runtime.surfaces.snapshot.renderNode(bold).warnings).toEqual([]);
    expect(
      runtime.surfaces.snapshot.renderNode(bold, { frame: 'card' }).warnings
    ).toEqual([missing]);
  });

  it('warns for a nested unmeasured node, and skips one hidden from snapshot', () => {
    const runtime = drawingRuntime(boldPrimitive, wrapPrimitive);
    const hidden = {
      type: 'bold',
      text: 'quiet',
      surfaces: ['text'],
    } as BoldNode;

    expect(
      runtime.surfaces.snapshot.render({
        type: 'view',
        body: [
          {
            type: 'wrap',
            items: [{ type: 'bold', text: 'short' }, hidden],
          } as WrapNode,
        ],
      }).warnings
    ).toEqual([
      {
        path: 'body[0]',
        message:
          'body[0] type "wrap" declares no snapshotHeight metric and will be measured as 0, sizing the frame short',
      },
      {
        path: 'body[0].items[0]',
        message:
          'body[0].items[0] type "bold" declares no snapshotHeight metric and will be measured as 0, sizing the frame short',
      },
    ]);
  });

  it('keeps collecting height warnings when a container cannot be walked', () => {
    // `children` reads `items` with no guard.
    const boxPrimitive = definePrimitive<{
      type: 'box';
      items: readonly { type: string }[];
    }>({
      type: 'box',
      catalog: {
        type: 'box',
        purpose: 'Hold children that a bad payload cannot list.',
        useWhen: ['A container callback assumes a valid shape.'],
        avoidWhen: ['The node is only a leaf.'],
        example: { type: 'box', items: [] },
      },
      examples: [{ type: 'box', items: [] }],
      schema: z.object({
        type: z.literal('box'),
        items: z.array(z.object({ type: z.string() })),
      }),
      children: (node) =>
        node.items.map((item, index) => ({
          node: item,
          path: `items[${index}]`,
        })),
      renderers: {
        react: () => null,
        text: () => 'box',
        markdown: () => md.paragraph('box'),
      },
    });
    const runtime = drawingRuntime(boxPrimitive, boldPrimitive);
    const box = { type: 'box' as const };
    const bold = { type: 'bold' as const, text: 'short' };
    const rendered = runtime.surfaces.snapshot.render(
      {
        type: 'view',
        body: [box, bold],
      },
      { onValidationError: 'collect' }
    );

    expect(rendered.warnings).toEqual([
      {
        path: 'body[0]',
        message:
          'body[0] type "box" declares no snapshotHeight metric and will be measured as 0, sizing the frame short',
      },
      {
        path: 'body[1]',
        message:
          'body[1] type "bold" declares no snapshotHeight metric and will be measured as 0, sizing the frame short',
      },
    ]);
  });

  it('prefixes height warnings per page, and skips a node that declares a height', () => {
    const tallPrimitive = definePrimitive<{ type: 'tall'; text: string }>({
      type: 'tall',
      catalog: {
        type: 'tall',
        purpose: 'Render text with a declared height.',
        useWhen: ['A frame sums node heights.'],
        avoidWhen: ['The frame is a fixed size.'],
        example: { type: 'tall', text: 'fits' },
      },
      examples: [{ type: 'tall', text: 'fits' }],
      schema: z.object({
        type: z.literal('tall'),
        text: z.string().min(1),
      }),
      metrics: { snapshotHeight: () => 24 },
      renderers: {
        react: (node) => createElement('strong', null, node.text),
        text: (node) => node.text,
        markdown: (node) => md.paragraph(node.text),
      },
    });
    const runtime = drawingRuntime(boldPrimitive, tallPrimitive);
    const bold = { type: 'bold' as const, text: 'short' };
    const tall = { type: 'tall' as const, text: 'fits' };

    expect(
      runtime.surfaces.snapshot.render({ type: 'view', body: [tall] }).warnings
    ).toEqual([]);
    expect(
      runtime.surfaces.snapshot.renderPages([
        { type: 'view', body: [bold] },
        { type: 'view', body: [tall, bold] },
      ]).warnings
    ).toEqual([
      {
        path: 'pages[0].body[0]',
        message:
          'pages[0].body[0] type "bold" declares no snapshotHeight metric and will be measured as 0, sizing the frame short',
      },
      {
        path: 'pages[1].body[1]',
        message:
          'pages[1].body[1] type "bold" declares no snapshotHeight metric and will be measured as 0, sizing the frame short',
      },
    ]);
  });

  it('marks a content frame for measuring, and reports no missing height under it', () => {
    // `bold` declares no `metrics.snapshotHeight`. Under a content frame the
    // estimate is not the size drawn, so a 0 for it sizes nothing short.
    const runtime = createIsomerRuntime({
      packs: [snapshotPackOf(boldPrimitive)],
      frames: {
        card: testFrame,
        message: { ...testFrame, sizing: 'content' },
      },
      defaultFrame: 'message',
    });
    const bold = { type: 'bold' as const, text: 'short' };
    const spec = { type: 'view' as const, body: [bold, bold] };
    const { snapshot } = runtime.surfaces;

    expect(snapshot.render(spec)).toMatchObject({
      width: 600,
      height: 80,
      heightMode: 'content',
      warnings: [],
    });
    expect(snapshot.render(spec, { height: 300 })).toMatchObject({
      height: 300,
      heightMode: 'fixed',
    });
    expect(snapshot.renderNode(bold)).toMatchObject({
      height: 40,
      heightMode: 'content',
      warnings: [],
    });
    expect(snapshot.render(spec, { frame: 'card' })).toMatchObject({
      height: 80,
      heightMode: 'fixed',
      warnings: [
        expect.objectContaining({ path: 'body[0]' }),
        expect.anything(),
      ],
    });
    expect(snapshot.renderNode(bold, { frame: 'card' }).heightMode).toBe(
      'fixed'
    );
  });

  it('sizes content-frame pages to the tallest estimate and leaves measuring to the backend', () => {
    const runtime = createIsomerRuntime({
      packs: [snapshotPackOf(boldPrimitive)],
      frames: { message: { ...testFrame, sizing: 'content' } },
    });
    const bold = { type: 'bold' as const, text: 'short' };
    const { snapshot } = runtime.surfaces;

    const document = snapshot.renderPages([
      { type: 'view', body: [bold] },
      { type: 'view', body: [bold, bold, bold] },
    ]);
    expect(document).toMatchObject({
      height: 120,
      heightMode: 'content',
      warnings: [],
    });
    expect(document.pages).toHaveLength(2);
    expect(
      snapshot.renderPages([{ type: 'view', body: [bold] }], { height: 500 })
    ).toMatchObject({ height: 500, heightMode: 'fixed' });
  });

  it('has no snapshot surface, and reports none, without a frame', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });

    expectTypeOf(runtime.surfaces.snapshot).toEqualTypeOf<undefined>();
    expect(runtime.surfaces.snapshot).toBeUndefined();
    expect(runtime.getCapabilities().surfaces).not.toContain('snapshot');
  });

  it("asks the style adapter for the render's scheme", () => {
    const schemes: unknown[] = [];
    const runtime = createIsomerRuntime({
      packs: [snapshotPackOf(notePrimitive)],
      frames: { card: testFrame },
      styleAdapter: {
        createCollector: () => ({}),
        createRenderContext: () => ({}),
        renderStyles: (_collector: object, { scheme }: HTMLRenderOptions) => {
          schemes.push(scheme);
          return '';
        },
      },
    });

    runtime.surfaces.snapshot.render(view('Dark'), { theme: 'dark' });
    runtime.surfaces.snapshot.render(view('Light'), { theme: 'light' });
    runtime.surfaces.snapshot.render(view('Auto'));

    expect(schemes).toEqual(['dark', 'light', 'light']);
  });

  it.each(['light', 'dark', 'auto'] as const)(
    'inherits the %s frame palette across packs and snapshot entry points',
    (theme) => {
      const light = '#E3E8F2';
      const dark = '#2B394F';
      const coloredNote = definePrimitive<NoteNode>({
        ...notePrimitive,
        renderers: {
          ...notePrimitive.renderers,
          react: (_node, { theme: palette }) => {
            const ink =
              palette === 'dark-theme'
                ? dark
                : palette === 'light-theme'
                  ? light
                  : `light-dark(${light}, ${dark})`;
            return createElement(
              'div',
              { style: { border: `1px solid ${ink}` } },
              createElement(
                'svg',
                null,
                createElement('path', {
                  fill: palette === 'dark-theme' ? dark : light,
                })
              )
            );
          },
        },
      });
      const runtime = createIsomerRuntime({
        packs: [
          snapshotPackOf(wrapPrimitive),
          definePrimitivePack<string>({
            id: 'test.colors',
            primitives: [coloredNote],
          }),
        ],
        frames: { card: testFrame },
      });
      const root: WrapNode = {
        type: 'wrap',
        items: [
          {
            type: 'wrap',
            items: [{ type: 'note', text: 'nested', surfaces: ['snapshot'] }],
          },
        ],
      };
      const composition = { type: 'view' as const, body: [root] };
      const { snapshot } = runtime.surfaces;
      const options = { theme, height: 40 };
      const results = [
        snapshot.render(composition, options),
        snapshot.renderNode(root, options),
        ...snapshot.renderPages([composition, composition], options).pages,
      ];
      for (const { html } of results) {
        const ink = theme === 'dark' ? dark : light;
        expect(html).toContain(`fill="${ink}"`);
        expect(html).toContain(`border:1px solid ${ink}`);
        expect(html).not.toContain('light-dark(');
      }
      expect(runtime.surfaces.html.render(composition).body).not.toContain(
        '<path'
      );
    }
  );

  it('renders a view and a single node through the runtime frame', () => {
    const runtime = drawingRuntime(notePrimitive);

    const rendered = runtime.surfaces.snapshot.render(view('Framed'), {
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

    const node = runtime.surfaces.snapshot.renderNode({
      type: 'note',
      text: 'Bare',
    } as NoteNode);
    expect(renderToStaticMarkup(node.element)).toContain('Bare');
  });

  it('renders node anchors on the snapshot surface only when asked', () => {
    const anchoredNote = definePrimitive<NoteNode>({
      ...notePrimitive,
      renderers: {
        ...notePrimitive.renderers,
        react: (node, { context }) =>
          createElement('span', nodeAnchor(context, node), node.text),
      },
    });
    const { snapshot } = drawingRuntime(anchoredNote).surfaces;
    const note = { type: 'note', text: 'Anchored' } as NoteNode;
    const markupOf = ({ element }: { element: ReactNode }) =>
      renderToStaticMarkup(element);

    expect(markupOf(snapshot.render(view('Anchored')))).not.toContain(
      'data-isomer-node'
    );
    expect(
      markupOf(snapshot.render(view('Anchored'), { anchors: true }))
    ).toContain('data-isomer-node="note"');
    expect(markupOf(snapshot.renderNode(note))).not.toContain(
      'data-isomer-node'
    );
    expect(markupOf(snapshot.renderNode(note, { anchors: true }))).toContain(
      'data-isomer-node="note"'
    );
  });

  it('honours width and height overrides on the snapshot surface', () => {
    const runtime = drawingRuntime(notePrimitive);
    const spec = view('Sized');

    expect(
      runtime.surfaces.snapshot.render(spec, { width: 800 })
    ).toMatchObject({
      width: 800,
      height: 40,
    });

    const rendered = runtime.surfaces.snapshot.render(spec, {
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

  it('measures each node in the theme it draws in', () => {
    const palettePrimitive = definePrimitive<PrimitiveNode>({
      type: 'palette',
      catalog: {
        type: 'palette',
        purpose: 'Palette fixture.',
        useWhen: [],
        avoidWhen: [],
        example: { type: 'palette' },
      },
      examples: [{ type: 'palette' }],
      schema: z.object({ type: z.literal('palette') }),
      metrics: {
        snapshotHeight: (_node, options) =>
          options?.theme === 'dark-theme' ? 200 : 100,
      },
      renderers: {
        react: () => null,
        text: () => 'palette',
        markdown: () => md.paragraph('palette'),
      },
    });
    const { snapshot } = createIsomerRuntime({
      packs: [snapshotPackOf(palettePrimitive)],
      frames: { card: testFrame },
    }).surfaces;
    const spec: Composition = { type: 'view', body: [{ type: 'palette' }] };
    // `testFrame` adds 40 per node.
    expect(snapshot.render(spec).height).toBe(140);
    expect(snapshot.render(spec, { theme: 'dark' }).height).toBe(240);
    expect(snapshot.render({ ...spec, theme: 'dark' }).height).toBe(240);
    expect(
      snapshot.renderPages([{ ...spec, theme: 'dark' }, spec]).height
    ).toBe(240);
    expect(snapshot.renderPages([spec, spec], { theme: 'dark' }).height).toBe(
      240
    );
    expect(snapshot.renderNode({ type: 'palette' }).height).toBe(140);
    expect(
      snapshot.renderNode({ type: 'palette' }, { theme: 'dark' }).height
    ).toBe(240);
  });

  describe('a frame that states its content width', () => {
    // Draws the width it is told, and is as tall as the width it is measured at.
    const widthPrimitive = definePrimitive<PrimitiveNode>({
      type: 'width',
      catalog: {
        type: 'width',
        purpose: 'Width fixture.',
        useWhen: [],
        avoidWhen: [],
        example: { type: 'width' },
      },
      examples: [{ type: 'width' }],
      schema: z.object({ type: z.literal('width') }),
      metrics: { snapshotHeight: (_node, options) => options?.width ?? -1 },
      renderers: {
        react: (_node, { context }) =>
          createElement('i', null, String(layoutWidthOf(context))),
        text: () => 'width',
        markdown: () => md.paragraph('width'),
      },
    });
    const padded: Frame<string> = {
      ...testFrame,
      contentWidth: (width) => width - 100,
    };
    const runtimeWith = (frame: Frame<string>) =>
      createIsomerRuntime({
        packs: [snapshotPackOf(widthPrimitive)],
        frames: { card: frame },
      });
    const spec: Composition = { type: 'view', body: [{ type: 'width' }] };

    it('tells each node the content width of the page it draws', () => {
      const { snapshot } = runtimeWith(padded).surfaces;
      expect(snapshot.render(spec).html).toContain('<i>500</i>');
      expect(snapshot.render(spec, { width: 1532 }).html).toContain(
        '<i>1432</i>'
      );
      expect(
        snapshot.renderPages([spec, spec], { width: 800 }).pages[1]?.html
      ).toContain('<i>700</i>');
    });

    it('estimates each node at that width', () => {
      const { snapshot } = runtimeWith(padded).surfaces;
      // `testFrame` adds 40 per node to the node's own estimate.
      expect(snapshot.render(spec).height).toBe(500 + 40);
      expect(snapshot.render(spec, { width: 1532 }).height).toBe(1432 + 40);
    });

    it('hands estimateHeight the width of the page it measures', () => {
      const seen: (number | undefined)[] = [];
      const recording: Frame<string> = {
        ...padded,
        estimateHeight: (composition, dispatcher, viewport) => {
          seen.push(viewport?.width);
          return testFrame.estimateHeight(composition, dispatcher, viewport);
        },
      };
      const { snapshot } = runtimeWith(recording).surfaces;
      snapshot.render(spec);
      snapshot.render(spec, { width: 900 });
      expect(seen).toEqual([600, 900]);
    });

    it('draws and measures a node with no surround at the whole page', () => {
      const bare = runtimeWith(padded).surfaces.snapshot.renderNode({
        type: 'width',
      });
      expect(bare.html).toContain('<i>600</i>');
      expect(bare).toMatchObject({ width: 600, height: 600 + 40 });
    });

    it('tells nodes no width under a frame that states none', () => {
      const { snapshot } = runtimeWith(testFrame).surfaces;
      const rendered = snapshot.render(spec, { width: 800 });
      expect(rendered.html).toContain('<i>undefined</i>');
      expect(rendered.height).toBe(-1 + 40);
    });

    it('tells nodes the width an html render states', () => {
      const { html } = runtimeWith(padded).surfaces;
      expect(html.render(spec).html).toContain('<i>undefined</i>');
      expect(html.render(spec, { width: 640 }).html).toContain('<i>640</i>');
    });
  });

  it('emits rules a style adapter discovers while the snapshot surface renders', () => {
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
      packs: [snapshotPackOf(notePrimitive)],
      frames: { card: testFrame },
      styleAdapter,
    });

    expect(runtime.surfaces.snapshot.render(view('Styled')).css).toBe(
      '.isomer{}.fluid{}.after{}'
    );
    expect(
      runtime.surfaces.snapshot.renderNode({
        type: 'note',
        text: 'n',
      } as NoteNode).css
    ).toBe('.isomer{}.fluid{}.after{}');
  });

  it('renders pages against one stylesheet collected across every composition', () => {
    const styleAdapter = {
      createCollector: () => ({ rules: [] as string[] }),
      collectWrapperStyles: (collector: { rules: string[] }) => {
        collector.rules.push('.isomer{}');
      },
      collectViewStyles: (
        composition: Composition,
        _dispatcher: unknown,
        collector: { rules: string[] }
      ) => {
        collector.rules.push(`.${(composition.body[0] as NoteNode).text}{}`);
      },
      createRenderContext: () => ({}),
      renderStyles: (collector: { rules: string[] }) =>
        collector.rules.join(''),
    };
    const runtime = createIsomerRuntime({
      packs: [snapshotPackOf(notePrimitive)],
      frames: { card: testFrame },
      styleAdapter,
    });
    const two = view('two');
    two.body.push({ type: 'note', text: 'more' });

    const rendered = runtime.surfaces.snapshot.renderPages([view('one'), two], {
      theme: 'dark',
    });
    const [first, second] = rendered.pages.map(
      ({ element }) =>
        element as ReactElement<{
          width: number;
          height: number;
          theme: string;
        }>
    );

    expect(rendered.css).toBe('.isomer{}.one{}.two{}');
    // Every page takes the tallest estimate: two notes at 40 each.
    expect(rendered).toMatchObject({ width: 600, height: 80 });
    expect(first?.props).toMatchObject({
      width: 600,
      height: 80,
      theme: 'dark-theme',
    });
    expect(renderToStaticMarkup(second)).toContain('more');
    expect(rendered.pages[1]?.html).toBe(renderToStaticMarkup(second));
  });

  it("draws every page in the first composition's theme", () => {
    const runtime = drawingRuntime(notePrimitive);

    const { pages } = runtime.surfaces.snapshot.renderPages([
      { ...view('a'), theme: 'dark' },
      { ...view('b'), theme: 'light' },
    ]);

    for (const { element } of pages) {
      expect((element as ReactElement<{ theme: string }>).props.theme).toBe(
        'dark-theme'
      );
    }
  });

  it('renders one page the way render does', () => {
    const runtime = drawingRuntime(notePrimitive);

    const single = runtime.surfaces.snapshot.render(view('same'));
    const paged = runtime.surfaces.snapshot.renderPages([view('same')]);

    expect(paged).toMatchObject({
      css: single.css,
      width: single.width,
      height: single.height,
    });
    expect(paged.pages[0]?.html).toBe(single.html);
  });

  it('pairs every snapshot with the static markup of its own tree', () => {
    const { snapshot } = drawingRuntime(notePrimitive).surfaces;

    const rendered = snapshot.render(view('markup'));
    const node = snapshot.renderNode({
      type: 'note',
      text: 'alone',
    } as NoteNode);

    expect(rendered.html).toBe(renderToStaticMarkup(rendered.element));
    expect(rendered.html).toContain('markup');
    expect(node.html).toBe(renderToStaticMarkup(node.element));
    expect(node.html).toContain('alone');
  });

  it('refuses an empty page list', () => {
    const runtime = drawingRuntime(notePrimitive);

    try {
      runtime.surfaces.snapshot.renderPages([]);
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({
        name: 'IsomerError',
        code: 'EMPTY_PAGES',
      });
    }
  });

  it("names the page a frame's own rule rejects", () => {
    const runtime = createIsomerRuntime({
      packs: [snapshotPackOf(notePrimitive)],
      frames: {
        single: {
          ...testFrame,
          validateBody: (body) =>
            body.length === 1 ? [] : ['needs exactly one node'],
        },
      },
    });
    const two = view('two');
    two.body.push({ type: 'note', text: 'more' });

    expect(() =>
      runtime.surfaces.snapshot?.renderPages([view('one'), two])
    ).toThrow(/frame "single" cannot draw page 2: needs exactly one node/);
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
        markdown: () => [],
      },
    });
    const runtime = drawingRuntime(swatchPrimitive);

    const dark = runtime.surfaces.snapshot.renderNode(
      { type: 'swatch' },
      { theme: 'dark' }
    );
    expect(renderToStaticMarkup(dark.element)).toContain('dark-theme');

    const light = runtime.surfaces.snapshot.renderNode({
      type: 'swatch',
    });
    expect(renderToStaticMarkup(light.element)).toContain('light-theme');
  });

  it('draws one pack of nodes under whichever frame the render names', () => {
    // The inversion, stated as a test: vocabulary composes, frame is chosen.
    // The same body renders at either width, and neither pack has an opinion.
    const runtime = createIsomerRuntime({
      packs: [snapshotPackOf(notePrimitive, boldPrimitive)],
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

    expect(runtime.surfaces.snapshot?.render(mixed).width).toBe(600);
    expect(
      runtime.surfaces.snapshot?.render(mixed, { frame: 'wide' }).width
    ).toBe(1920);
  });

  it('rejects a frame name inherited from Object.prototype', () => {
    // `frame` is caller-supplied, so a truthiness check on the record would
    // treat `'constructor'` as a frame and fail later as a `TypeError` about
    // something unrelated.
    expect(() =>
      createIsomerRuntime({
        packs: [snapshotPackOf(notePrimitive)],
        frames: { card: testFrame },
        defaultFrame: 'constructor',
      })
    ).toThrow(/defaultFrame "constructor" is not one of the supplied frames/);

    const runtime = drawingRuntime(notePrimitive);
    expect(() =>
      runtime.surfaces.snapshot?.render(view('Framed'), { frame: 'toString' })
    ).toThrow(/no frame named "toString"/);
  });

  it('requires defaultFrame when more than one frame is supplied', () => {
    expect(() =>
      createIsomerRuntime({
        packs: [snapshotPackOf(notePrimitive)],
        frames: { card: testFrame, slide: fixedFrame },
      })
    ).toThrow(/defaultFrame is required/);
  });

  it('builds the snapshot surface for a frame named by the empty string', () => {
    // Degenerate but legal: `''` is a record key like any other, and a
    // truthiness check on the resolved default would drop the surface here
    // while every other part of the configuration reported itself as valid.
    const runtime = createIsomerRuntime({
      packs: [snapshotPackOf(notePrimitive)],
      frames: { '': testFrame },
    });

    expect(runtime.surfaces.snapshot?.render(view('Framed')).width).toBe(600);
    expect(runtime.getCapabilities().surfaces).toContain('snapshot');
  });

  it('rejects an empty frames map rather than typing an absent snapshot surface as present', () => {
    expect(() =>
      createIsomerRuntime({
        packs: [snapshotPackOf(notePrimitive)],
        frames: {},
      })
    ).toThrow(
      expect.objectContaining({ name: 'IsomerError', code: 'EMPTY_FRAMES' })
    );
  });

  it('rejects defaultFrame when no frames are supplied', () => {
    expect(() =>
      createIsomerRuntime({
        packs: [snapshotPackOf(notePrimitive)],
        defaultFrame: 'card',
      })
    ).toThrow(
      expect.objectContaining({ name: 'IsomerError', code: 'UNKNOWN_FRAME' })
    );
  });

  it('rejects a render naming a frame it does not hold', () => {
    const runtime = drawingRuntime(notePrimitive);

    expect(() =>
      runtime.surfaces.snapshot?.render(view('Framed'), { frame: 'nope' })
    ).toThrow(/no frame named "nope"/);
  });

  it("refuses a body the frame's own rule rejects", () => {
    const runtime = createIsomerRuntime({
      packs: [snapshotPackOf(notePrimitive)],
      frames: {
        single: {
          ...testFrame,
          validateBody: (body) =>
            body.length === 1 ? [] : ['needs exactly one node'],
        },
      },
    });

    expect(() =>
      runtime.surfaces.snapshot?.render({
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
      packs: [snapshotPackOf(notePrimitive)],
      frames: { card: rejecting, slide: rejecting },
      defaultFrame: 'card',
    });
    const composition: Composition = {
      type: 'view',
      body: [{ type: 'note', text: 'one' } as NoteNode],
    };

    expect(() => runtime.surfaces.snapshot?.render(composition)).toThrow(
      /frame "card" cannot draw this composition: rejected/
    );
    expect(() =>
      runtime.surfaces.snapshot?.render(composition, { frame: 'slide' })
    ).toThrow(/frame "slide" cannot draw this composition: rejected/);
  });

  it('draws with a host palette in place of the frame default', () => {
    // Branding is a spread now rather than an override mechanism: frame is an
    // ordinary value the host owns, so there is nothing to reopen.
    const runtime = createIsomerRuntime({
      packs: [snapshotPackOf(notePrimitive)],
      frames: {
        card: {
          ...testFrame,
          theme: { light: 'brand-light', dark: 'brand-dark' },
        },
      },
    });

    const rendered = runtime.surfaces.snapshot.render(view('themed'))
      .element as ReactElement<{ theme: string }>;
    expect(rendered.props.theme).toBe('brand-light');
  });

  it('draws a host frame around the generically dispatched body', () => {
    // A frame replaces only the surround. The body inside it comes from the
    // runtime's dispatcher either way, so a host frame cannot change what a
    // spec contains.
    const runtime = createIsomerRuntime({
      packs: [snapshotPackOf(notePrimitive)],
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

    const rendered = runtime.surfaces.snapshot.render(view('framed'))
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
      packs: [snapshotPackOf(notePrimitive)],
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

    runtime.surfaces.snapshot?.render({
      ...view('framed'),
      title: 'Quarterly',
    });

    expect(seen).toEqual({ title: 'Quarterly' });
    expect(Object.keys(seen!).sort()).toEqual(['subtitle', 'theme', 'title']);
  });

  it('keeps geometry with the frame a host reframes', () => {
    const runtime = createIsomerRuntime({
      packs: [snapshotPackOf(notePrimitive)],
      frames: {
        card: {
          ...testFrame,
          wrap: (_spec, body) => createElement('host-frame', null, body),
        },
      },
    });

    // 600 from `testFrame.defaultWidth`, 40 from its per-node estimate: a
    // replaced frame is drawn within a viewport the frame still sizes.
    expect(runtime.surfaces.snapshot?.render(view('framed'))).toMatchObject({
      width: 600,
      height: 40,
    });
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
      runtime.surfaces.snapshot.render(mixed).element
    );
    expect(markup).toContain('from one pack');
    expect(markup).toContain('from another');
  });

  it('composes a drawing pack with a pack that renders no snapshot', () => {
    // The validator still warns per node that the frameless pack's nodes will
    // be absent from an image, but the spec itself is fine.
    const runtime = createIsomerRuntime({
      packs: [snapshotPackOf(notePrimitive), packOf(plainPrimitive)],
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

  it('reports snapshot as a surface once the host supplies a frame', () => {
    const runtime = drawingRuntime(notePrimitive);

    expect(runtime.getCapabilities().surfaces).toContain('snapshot');
  });

  it('enforces validation on the snapshot surface', () => {
    const runtime = drawingRuntime(notePrimitive);

    expect(() =>
      runtime.surfaces.snapshot?.render(
        { type: 'view', body: [{ type: 'note', text: '' } as NoteNode] },
        { onValidationError: 'throw' }
      )
    ).toThrow();
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
      packs: [snapshotPackOf(notePrimitive)],
      frames: { card: numberFrame },
    });
  });
});
