/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import {
  type AnyPrimitiveDefinition,
  type Composition,
  definePrimitive,
  definePrimitivePack,
  type PackDistillery,
  type PrimitiveNode,
  type PrimitiveRenderContext,
  type StyledRenderContext,
  type StyleHandle,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { createIsomerRuntime } from './index';
import {
  type BoldNode,
  boldPrimitive,
  type NoteNode,
  notePrimitive,
  packOf,
  type PlainNode,
  plainPrimitive,
  testFrame,
  view,
  type WrapNode,
  wrapPrimitive,
} from './runtime.fixtures';

describe('createIsomerRuntime', () => {
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

  describe('styling packs', () => {
    const adapter = (css: string) => ({
      createCollector: () => ({ css }),
      createRenderContext: () => ({}),
      renderStyles: (collector: { css: string }) => collector.css,
    });

    const styledPacks = () => [
      definePrimitivePack({
        id: 'test.one',
        surfaces: [],
        primitives: [notePrimitive],
        styleAdapter: adapter('.one {}'),
      }),
      definePrimitivePack({
        id: 'test.two',
        surfaces: [],
        primitives: [boldPrimitive],
        styleAdapter: adapter('.two {}'),
      }),
    ];

    it('lets one host adapter replace both pack adapters', () => {
      const runtime = createIsomerRuntime({
        packs: styledPacks(),
        styleAdapter: adapter('.chosen {}'),
      });

      expect(runtime.surfaces.html.render(view('ok')).css).toBe('.chosen {}');
    });

    it('serves an adapterless pack with the one pack adapter', () => {
      const keys: string[] = [];
      const runtime = createIsomerRuntime({
        packs: [
          definePrimitivePack({
            id: 'test.one',
            surfaces: [],
            primitives: [notePrimitive],
            styleAdapter: {
              createCollector: () => ({}),
              createRenderContext: () => ({
                resolveClassName: (...handles: StyleHandle[]) => {
                  keys.push(...handles.map(({ key }) => key));
                  return 'styled';
                },
              }),
              renderStyles: () => '.styled {}',
            },
          }),
          definePrimitivePack({
            id: 'test.two',
            surfaces: [],
            primitives: [
              definePrimitive<BoldNode>({
                ...boldPrimitive,
                renderers: {
                  ...boldPrimitive.renderers,
                  react: (node, { context }) => {
                    const { resolveClassName } = context as {
                      resolveClassName: (...handles: StyleHandle[]) => string;
                    };
                    return createElement(
                      'b',
                      {
                        className: resolveClassName({
                          key: 'bold',
                          readableName: 'bold',
                        }),
                      },
                      node.text
                    );
                  },
                },
              }),
            ],
          }),
        ],
      });

      const result = runtime.surfaces.html.render({
        type: 'view',
        body: [{ type: 'bold', text: 'b' } as BoldNode],
      });
      expect(result.body).toContain('class="styled"');
      expect(result.css).toBe('.styled {}');
      expect(new Set(keys)).toEqual(new Set(['bold']));
    });

    it('throws when an adapterless pack disagrees with the pack adapter', () => {
      const styledBold = definePrimitive<BoldNode>({
        ...boldPrimitive,
        collectStyles: () => undefined,
      });

      try {
        createIsomerRuntime({
          packs: [
            definePrimitivePack({
              id: 'test.one',
              surfaces: [],
              primitives: [notePrimitive],
              styleAdapter: { ...adapter(''), styleCollector: 'distillate' },
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
  });

  describe('distillery packs', () => {
    /** A stand-in Distillery whose stylesheet is one `.<name>{}` per resolved handle. */
    const distilleryOf = (moduleName: string) => {
      const handleList: StyleHandle[] = [];
      const collected = new WeakMap<object, Set<string>>();
      const distillery: PackDistillery = {
        registry: {
          module: (name) => (name === moduleName ? { handleList } : undefined),
        },
        artifactCollector: () => {
          const collector = {
            useHandles: (handles: readonly StyleHandle[]) => {
              for (const { readableName } of handles) {
                collected.get(collector)!.add(readableName);
              }
            },
          };
          collected.set(collector, new Set());
          return collector;
        },
        renderStyles: (collector) =>
          [...collected.get(collector)!].map((name) => `.${name}{}`).join(''),
      };
      const handle = (key: string) => {
        const created = {
          key,
          readableName: `${moduleName}-${key}`,
          moduleName,
        };
        handleList.push(created);
        return created;
      };
      return { distillery, handle };
    };

    /** `definition` drawn as a span classed by `handle`, carrying the enhancement ids its context holds. */
    const classed = (definition: AnyPrimitiveDefinition, handle: StyleHandle) =>
      ({
        ...definition,
        renderers: {
          ...definition.renderers,
          react: (
            node: PrimitiveNode & { text: string },
            { context }: { context: StyledRenderContext }
          ) =>
            createElement(
              'span',
              {
                className: context.resolveClassName?.(handle),
                'data-enhancements': [...(context.enhancements ?? [])].join(
                  ' '
                ),
              },
              node.text
            ),
        },
      }) as AnyPrimitiveDefinition;

    const twoPacks = () => {
      const one = distilleryOf('one');
      const two = distilleryOf('two');
      return [
        definePrimitivePack<string>({
          id: 'test.one',
          surfaces: [],
          primitives: [
            wrapPrimitive,
            classed(notePrimitive, one.handle('note')),
          ],
          distillery: one.distillery,
          enhancements: [{ id: 'one.enhance', appliesTo: () => true }],
        }),
        definePrimitivePack<string>({
          id: 'test.two',
          surfaces: [],
          primitives: [classed(boldPrimitive, two.handle('bold'))],
          distillery: two.distillery,
        }),
      ];
    };

    it("records each handle in its own distillery inside another pack's container, joining their CSS in pack order", () => {
      const runtime = createIsomerRuntime({ packs: twoPacks() });

      const { body, css } = runtime.surfaces.html.render(
        {
          type: 'view',
          body: [
            {
              type: 'wrap',
              items: [
                { type: 'bold', text: 'b' },
                { type: 'note', text: 'n' },
              ],
            } as WrapNode,
          ],
        },
        { enhancements: ['one.enhance'] }
      );
      expect(body).toContain(
        '<span class="two-bold" data-enhancements="one.enhance">b</span>'
      );
      expect(body).toContain(
        '<span class="one-note" data-enhancements="one.enhance">n</span>'
      );
      expect(css).toBe('.one-note{}\n.two-bold{}');
    });

    it('joins the snapshot stylesheet the same way', () => {
      const runtime = createIsomerRuntime({
        packs: twoPacks(),
        frames: { card: testFrame },
      });

      const { css } = runtime.surfaces.snapshot.render({
        type: 'view',
        body: [
          { type: 'note', text: 'n' } as NoteNode,
          { type: 'bold', text: 'b' } as BoldNode,
        ],
      });
      expect(css).toBe('.one-note{}\n.two-bold{}');
    });

    it('emits a distillery two packs share once', () => {
      const shared = distilleryOf('shared');
      const runtime = createIsomerRuntime({
        packs: [
          definePrimitivePack({
            id: 'test.one',
            surfaces: [],
            primitives: [classed(notePrimitive, shared.handle('note'))],
            distillery: shared.distillery,
          }),
          definePrimitivePack({
            id: 'test.two',
            surfaces: [],
            primitives: [classed(boldPrimitive, shared.handle('bold'))],
            distillery: shared.distillery,
          }),
        ],
      });

      expect(
        runtime.surfaces.html.render({
          type: 'view',
          body: [
            { type: 'note', text: 'n' } as NoteNode,
            { type: 'bold', text: 'b' } as BoldNode,
          ],
        }).css
      ).toBe('.shared-note{}.shared-bold{}');
    });

    it('styles a pack without a distillery through the distilleries', () => {
      const [one] = twoPacks();
      const plain = distilleryOf('plain');
      const runtime = createIsomerRuntime({
        packs: [
          one!,
          definePrimitivePack({
            id: 'test.three',
            surfaces: [],
            primitives: [classed(plainPrimitive, plain.handle('plain'))],
          }),
        ],
      });

      const { body, css } = runtime.surfaces.html.render({
        type: 'view',
        body: [{ type: 'plain', text: 'p' } as PlainNode],
      });
      expect(body).toContain('class="plain-plain"');
      expect(css).toBe('.plain-plain{}');
    });

    it.each([
      ['an emotion collector', { styleCollector: 'emotion' }],
      ['no collector tag', {}],
    ])(
      'refuses a pack whose collectStyles the distilleries would never run, with %s, unless the host supplies an adapter',
      (_, tag) => {
        const collecting = () => [
          twoPacks()[0]!,
          definePrimitivePack({
            id: 'test.three',
            surfaces: [],
            primitives: [
              definePrimitive<PlainNode>({
                ...plainPrimitive,
                collectStyles: () => undefined,
              }),
            ],
            ...tag,
          }),
        ];

        try {
          createIsomerRuntime({ packs: collecting() });
          expect.unreachable();
        } catch (error) {
          expect(error).toMatchObject({
            name: 'IsomerError',
            code: 'INCOMPATIBLE_STYLE_COLLECTOR',
          });
          expect((error as Error).message).toContain(
            'pack "test.three" primitive "plain" declares collectStyles'
          );
        }

        expect(() =>
          createIsomerRuntime({
            packs: collecting(),
            styleAdapter: {
              createCollector: () => ({}),
              createRenderContext: () => ({}),
              renderStyles: () => '',
            },
          })
        ).not.toThrow();
      }
    );

    const adapterPack = (id: string, primitive: AnyPrimitiveDefinition) =>
      definePrimitivePack({
        id,
        surfaces: [],
        primitives: [primitive],
        styleAdapter: {
          createCollector: () => ({}),
          createRenderContext: () => ({}),
          renderStyles: () => `.${id}{}`,
        },
      });

    it.each([
      [
        'a pack styleAdapter beside a distillery',
        () => [twoPacks()[0]!, adapterPack('test.three', plainPrimitive)],
        `pack "test.three"'s styleAdapter and the distilleries of packs "test.one"`,
      ],
      [
        'two pack styleAdapters',
        () => [
          adapterPack('test.one', notePrimitive),
          adapterPack('test.two', boldPrimitive),
        ],
        `pack "test.one"'s styleAdapter and pack "test.two"'s styleAdapter`,
      ],
    ])('throws for %s unless the host chooses', (_, packs, named) => {
      try {
        createIsomerRuntime({ packs: packs() });
        expect.unreachable();
      } catch (error) {
        expect(error).toMatchObject({
          name: 'IsomerError',
          code: 'AMBIGUOUS_STYLE_ADAPTER',
        });
        expect((error as Error).message).toContain(named);
      }

      const runtime = createIsomerRuntime({
        packs: packs(),
        styleAdapter: {
          createCollector: () => ({}),
          createRenderContext: () => ({}),
          renderStyles: () => '.host{}',
        },
      });
      expect(runtime.surfaces.html.render(view('ok')).css).toBe('.host{}');
    });
  });

  describe('enhancements across packs', () => {
    const hasType =
      (type: string) =>
      (body: readonly PrimitiveNode[]): boolean =>
        body.some((node) => node.type === type);
    it('exposes every pack enhancement on the runtime', () => {
      const runtime = createIsomerRuntime({
        packs: [
          definePrimitivePack({
            id: 'a',
            surfaces: [],
            primitives: [notePrimitive],
            enhancements: [
              {
                id: 'noteCopy',
                name: 'Note copy',
                appliesTo: hasType('note'),
              },
            ],
          }),
        ],
      });
      expect(runtime.enhancements).toEqual([
        expect.objectContaining({ id: 'noteCopy', name: 'Note copy' }),
      ]);
    });
    const enhancedPacks = () => [
      definePrimitivePack({
        id: 'a',
        surfaces: [],
        primitives: [notePrimitive],
        enhancements: [
          { id: 'noteCopy', appliesTo: hasType('note'), script: 'root.a = 1;' },
        ],
      }),
      definePrimitivePack({
        id: 'b',
        surfaces: [],
        primitives: [boldPrimitive],
        enhancements: [
          { id: 'boldSort', appliesTo: hasType('bold'), script: 'root.b = 1;' },
        ],
      }),
    ];
    const seen = (context: unknown) =>
      [...((context as PrimitiveRenderContext).enhancements ?? [])]
        .sort()
        .join(',');
    const runtimeOf = () =>
      createIsomerRuntime({
        packs: enhancedPacks(),
        rendererOverrides: {
          note: {
            react: (node, { context }) =>
              createElement(
                'span',
                { 'data-seen': seen(context) },
                (node as NoteNode).text
              ),
          },
          bold: {
            react: (node, { context }) =>
              createElement(
                'strong',
                { 'data-seen': seen(context) },
                (node as BoldNode).text
              ),
          },
        },
      });
    const requested = { enhancements: ['noteCopy', 'boldSort', 'absent'] };

    it('hands every pack’s renderers the resolved set and emits each script once', () => {
      const { body, js } = runtimeOf().surfaces.html.render(
        {
          type: 'view',
          body: [
            { type: 'note', text: 'n' } as NoteNode,
            { type: 'bold', text: 'b' } as BoldNode,
          ],
        },
        { ...requested, scripts: 'host' }
      );
      expect(body).toContain('<span data-seen="boldSort,noteCopy">');
      expect(body).toContain('<strong data-seen="boldSort,noteCopy">');
      expect(js.split('root.a = 1;')).toHaveLength(2);
      expect(js.split('root.b = 1;')).toHaveLength(2);
    });

    it('leaves out an enhancement the body has nothing for, and its script', () => {
      const { body, js } = runtimeOf().surfaces.html.render(
        { type: 'view', body: [{ type: 'note', text: 'n' } as NoteNode] },
        { ...requested, scripts: 'host' }
      );
      expect(body).toContain('<span data-seen="noteCopy">');
      expect(js).toContain('root.a = 1;');
      expect(js).not.toContain('root.b = 1;');
    });
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
});
