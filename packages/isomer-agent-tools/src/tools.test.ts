/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  slideDeckFrame,
  slideDeckPrimitives,
  slidesPack,
} from '@elastic/isomer-primitives-slides';
import {
  createIsomerRuntime,
  defineView,
  type IsomerRuntime,
} from '@elastic/isomer-runtime';
import {
  type Composition,
  CompositionValidationError,
  formatValidationError,
  ISOMER_ERROR_CODES,
} from '@elastic/isomer-sdk';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { z } from 'zod';

import { MAX_INPUT_CHARACTERS, MAX_INPUT_DEPTH } from './budget';
import { checkComposition } from './check';
import { ISOMER_TOOL_NAMES } from './names';
import { createIsomerTools } from './tools';
import type {
  IsomerTool,
  IsomerToolResult,
  IsomerToolsFrame,
  IsomerToolsRuntime,
} from './types';

const slide = slideDeckPrimitives.find(({ type }) => type === 'slideFrame')!
  .examples[0];

const oneSlide = { type: 'view', body: [slide] };

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
  views: [
    defineView({
      id: 'one-slide',
      title: 'One slide',
      answers: ['show a slide'],
      input: z.object({ title: z.string() }),
      build: () => oneSlide as Composition,
    }),
  ],
});

const call = (
  tools: readonly IsomerTool[],
  name: string,
  args: Record<string, unknown> = {}
): Promise<IsomerToolResult> => {
  const tool = tools.find((candidate) => candidate.name === name)!;
  return tool.handler(tool.inputSchema.parse(args));
};

const textOf = ({ content }: IsomerToolResult): string => {
  const [block] = content;
  if (block?.type !== 'text') {
    throw new Error('expected a text block');
  }
  return block.text;
};

const jsonOf = (result: IsomerToolResult): Record<string, unknown> =>
  JSON.parse(textOf(result)) as Record<string, unknown>;

const nested = (depth: number): unknown =>
  Array.from({ length: depth - 1 }).reduce<unknown>((inner) => [inner], []);

const FRAME_RULE = /exactly one "slideFrame" node, got 2 nodes/;

describe('createIsomerTools', () => {
  const tools = createIsomerTools({ runtime, frame: slideDeckFrame });

  it('offers every tool, in order', () => {
    expect(tools.map(({ name }) => name)).toEqual(
      Object.values(ISOMER_TOOL_NAMES)
    );
  });

  it('omits the view tools when the runtime registers no views', () => {
    const viewless = createIsomerRuntime({ packs: [slidesPack] });
    expect(
      createIsomerTools({ runtime: viewless }).map(({ name }) => name)
    ).toEqual([
      ISOMER_TOOL_NAMES.authoringGuide,
      ISOMER_TOOL_NAMES.describePrimitives,
      ISOMER_TOOL_NAMES.validate,
      ISOMER_TOOL_NAMES.render,
    ]);
  });

  describe('isomer_authoring_guide', () => {
    it('indexes every primitive once, with views and no schema', async () => {
      const guide = textOf(await call(tools, ISOMER_TOOL_NAMES.authoringGuide));
      for (const { type } of slideDeckPrimitives) {
        expect(guide.split(`- \`${type}\` — `)).toHaveLength(2);
      }
      expect(guide).toContain('`one-slide`');
      expect(guide).toContain(ISOMER_TOOL_NAMES.describePrimitives);
      expect(guide).not.toContain('## JSON Schema');
      expect(guide).not.toContain('Use when:');
    });

    it('keeps each host rule on one line', async () => {
      const guide = textOf(
        await call(
          createIsomerTools({
            runtime,
            rules: [
              'One idea\n## Injected',
              'Short\u2028## Also',
              'Two\r\nlines',
            ],
          }),
          ISOMER_TOOL_NAMES.authoringGuide
        )
      );
      expect(guide).toContain(
        '## Rules\n\n- One idea ## Injected\n- Short ## Also\n- Two lines'
      );
      expect(guide).not.toMatch(/[\r\u2028\u2029]/);
    });
  });

  describe('isomer_describe_primitives', () => {
    it('returns each entry and a schema whose refs resolve', async () => {
      const text = textOf(
        await call(tools, ISOMER_TOOL_NAMES.describePrimitives, {
          types: ['slideFrame', 'slideStack'],
        })
      );
      expect(text).toContain('- `slideFrame` — ');
      expect(text).toContain('- `slideStack` — ');
      expect(text).toContain('Use when:');
      const json = /```json\n([\s\S]*)\n```/.exec(text)?.[1] ?? '{}';
      const { $defs } = JSON.parse(json) as { $defs: Record<string, unknown> };
      expect(Object.keys($defs)).toEqual(
        expect.arrayContaining(['slideFrame', 'slideStack', 'bodyNode'])
      );
      for (const [, id] of json.matchAll(/"#\/\$defs\/([^"]+)"/g)) {
        expect($defs).toHaveProperty([id!]);
      }
    });

    it('names unknown types as JSON and lists the known ones', async () => {
      const result = await call(tools, ISOMER_TOOL_NAMES.describePrimitives, {
        types: ['slideFrame', 'a\n## Injected'],
      });
      expect(result.isError).toBe(true);
      const { unknown, known } = jsonOf(result);
      expect(unknown).toEqual(['a\n## Injected']);
      expect(known).toContain('slideFrame');
      expect(textOf(result)).not.toContain('\n## Injected');
    });

    it('bounds the number and length of types', () => {
      const { inputSchema } = tools.find(
        ({ name }) => name === ISOMER_TOOL_NAMES.describePrimitives
      )!;
      const parses = (types: string[]) =>
        inputSchema.safeParse({ types }).success;
      expect(parses(Array.from({ length: 12 }, () => 'slideFrame'))).toBe(true);
      expect(parses(Array.from({ length: 13 }, () => 'slideFrame'))).toBe(
        false
      );
      expect(parses([])).toBe(false);
      expect(parses([''])).toBe(false);
      expect(parses(['x'.repeat(200)])).toBe(true);
      expect(parses(['x'.repeat(201)])).toBe(false);
    });
  });

  describe('isomer_validate', () => {
    it('accepts a single slide', async () => {
      const result = await call(tools, ISOMER_TOOL_NAMES.validate, {
        composition: oneSlide,
      });
      expect(result.isError).toBeUndefined();
      expect(jsonOf(result)).toMatchObject({ valid: true, errors: [] });
    });

    it('reports the frame’s body rule without failing the call', async () => {
      const result = await call(tools, ISOMER_TOOL_NAMES.validate, {
        composition: { type: 'view', body: [slide, slide] },
      });
      expect(result.isError).toBeUndefined();
      expect(jsonOf(result)).toMatchObject({
        valid: false,
        errors: [expect.stringMatching(FRAME_RULE)],
      });
    });

    it('names the node type of a nested schema error', async () => {
      const { valid, errors } = jsonOf(
        await call(tools, ISOMER_TOOL_NAMES.validate, {
          composition: { type: 'view', body: [{ ...slide, nope: 1 }] },
        })
      );
      expect(valid).toBe(false);
      expect(errors).toEqual([expect.stringContaining('(in slideFrame)')]);
    });

    // The view, its body, and the stack hold three of the levels.
    const stackOfDepth = (depth: number) => ({
      type: 'view',
      body: [{ type: 'slideStack', children: nested(depth - 3) }],
    });

    it('parses a composition at the depth limit', async () => {
      const parse = vi.fn((value: unknown) => runtime.parse(value));
      const { errors } = jsonOf(
        await call(
          createIsomerTools({ runtime: { ...runtime, parse } }),
          ISOMER_TOOL_NAMES.validate,
          { composition: stackOfDepth(MAX_INPUT_DEPTH) }
        )
      );
      expect(parse).toHaveBeenCalledOnce();
      expect(errors).not.toContain(
        `The input nests deeper than ${MAX_INPUT_DEPTH} levels.`
      );
    });

    it('refuses a composition past the depth limit before parsing it', async () => {
      const parse = vi.fn((value: unknown) => runtime.parse(value));
      const result = await call(
        createIsomerTools({ runtime: { ...runtime, parse } }),
        ISOMER_TOOL_NAMES.validate,
        { composition: stackOfDepth(MAX_INPUT_DEPTH + 1) }
      );
      expect(parse).not.toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      expect(jsonOf(result)).toEqual({
        valid: false,
        errors: [`The input nests deeper than ${MAX_INPUT_DEPTH} levels.`],
        warnings: [],
      });
    });

    it('skips the body rule without a frame', async () => {
      const { valid } = jsonOf(
        await call(createIsomerTools({ runtime }), ISOMER_TOOL_NAMES.validate, {
          composition: { type: 'view', body: [slide, slide] },
        })
      );
      expect(valid).toBe(true);
    });
  });

  describe('isomer_render', () => {
    const surfaces = ['text', 'markdown', 'html', 'slack'];

    it.each(surfaces)('renders %s', async (surface) => {
      const result = await call(tools, ISOMER_TOOL_NAMES.render, {
        composition: oneSlide,
        surface,
      });
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).not.toBe('');
    });

    it.each(surfaces)(
      'leaves the title out of %s when heading is false',
      async (surface) => {
        const titled = { ...oneSlide, title: 'Envelope title' };
        // HTML keeps the title as the wrapper's `aria-label`.
        const shown = async (list: readonly IsomerTool[]) =>
          textOf(
            await call(list, ISOMER_TOOL_NAMES.render, {
              composition: titled,
              surface,
            })
          ).replace(/aria-label="[^"]*"/g, '');
        expect(await shown(tools)).toMatch(/envelope title/i);
        expect(
          await shown(createIsomerTools({ runtime, heading: false }))
        ).not.toMatch(/envelope title/i);
      }
    );

    it('returns the errors of an invalid composition as a failed call', async () => {
      const result = await call(tools, ISOMER_TOOL_NAMES.render, {
        composition: { type: 'view', body: [slide, slide] },
        surface: 'text',
      });
      expect(result.isError).toBe(true);
      expect(jsonOf(result)).toMatchObject({
        valid: false,
        errors: [expect.stringMatching(FRAME_RULE)],
      });
    });

    it.each([
      [undefined, 'data-theme="dark"'],
      ['light', 'data-theme="light"'],
    ])(
      'renders html with theme %s over the composition’s dark, its CSS inline',
      async (theme, attribute) => {
        const html = textOf(
          await call(tools, ISOMER_TOOL_NAMES.render, {
            composition: { ...oneSlide, theme: 'dark' },
            surface: 'html',
            ...(theme === undefined ? {} : { theme }),
          })
        );
        expect(html).toContain(attribute);
        expect(html).toContain('<style>');
      }
    );

    it('returns a composition over the input budget as a failed call', async () => {
      const result = await call(tools, ISOMER_TOOL_NAMES.render, {
        composition: { ...oneSlide, title: 'x'.repeat(MAX_INPUT_CHARACTERS) },
        surface: 'text',
      });
      expect(result.isError).toBe(true);
      expect(jsonOf(result)).toEqual({
        valid: false,
        errors: [
          `The input holds more than ${MAX_INPUT_CHARACTERS} characters.`,
        ],
      });
    });

    it('offers png only with an image function', () => {
      const acceptsPng = (list: readonly IsomerTool[]) =>
        list
          .find(({ name }) => name === ISOMER_TOOL_NAMES.render)!
          .inputSchema.safeParse({ composition: oneSlide, surface: 'png' })
          .success;
      expect(acceptsPng(tools)).toBe(false);
      expect(
        acceptsPng(
          createIsomerTools({
            runtime,
            image: () => Promise.resolve(new Uint8Array()),
          })
        )
      ).toBe(true);
    });

    it('returns png bytes as base64 image content, past one chunk', async () => {
      const bytes = Uint8Array.from({ length: 0x8000 * 2 + 3 }, (_, i) => i);
      const image = vi.fn(() => Promise.resolve(bytes));
      const result = await call(
        createIsomerTools({ runtime, image }),
        ISOMER_TOOL_NAMES.render,
        { composition: oneSlide, surface: 'png', theme: 'dark' }
      );
      const [block] = result.content;
      expect(block).toMatchObject({ type: 'image', mimeType: 'image/png' });
      const decoded = Uint8Array.from(
        atob(block?.type === 'image' ? block.data : ''),
        (char) => char.charCodeAt(0)
      );
      expect(decoded).toEqual(bytes);
      expect(image).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'view' }),
        { theme: 'dark' }
      );
    });

    it('returns a rejecting rasterizer as a failed call', async () => {
      const result = await call(
        createIsomerTools({
          runtime,
          image: () => Promise.reject(new Error('rasterizer is down')),
        }),
        ISOMER_TOOL_NAMES.render,
        { composition: oneSlide, surface: 'png' }
      );
      expect(result).toEqual({
        content: [{ type: 'text', text: 'rasterizer is down' }],
        isError: true,
      });
    });
  });

  describe('views', () => {
    it('lists registered views', async () => {
      const views = JSON.parse(
        textOf(await call(tools, ISOMER_TOOL_NAMES.listViews))
      ) as Array<{ id: string }>;
      expect(views.map(({ id }) => id)).toEqual(['one-slide']);
    });

    it('returns a requested view with its validation', async () => {
      const result = await call(tools, ISOMER_TOOL_NAMES.requestView, {
        id: 'one-slide',
        input: { title: 'Hello' },
      });
      expect(result.isError).toBeUndefined();
      expect(jsonOf(result)).toMatchObject({
        valid: true,
        composition: { type: 'view' },
      });
    });

    it('reports invalid input as its findings', async () => {
      const result = await call(tools, ISOMER_TOOL_NAMES.requestView, {
        id: 'one-slide',
        input: {},
      });
      expect(result.isError).toBe(true);
      expect(jsonOf(result)).toMatchObject({
        error: 'Invalid input for view "one-slide":',
        errors: [expect.stringContaining('title')],
      });
    });

    const requestSpy = () => {
      const request = vi.fn(runtime.viewRegistry.request);
      const spied = createIsomerTools({
        runtime: {
          ...runtime,
          viewRegistry: { ...runtime.viewRegistry, request },
        },
      });
      return { request, spied };
    };

    it('passes view input at the depth limit to the view', async () => {
      const { request, spied } = requestSpy();
      await call(spied, ISOMER_TOOL_NAMES.requestView, {
        id: 'one-slide',
        input: { title: nested(MAX_INPUT_DEPTH - 1) },
      });
      expect(request).toHaveBeenCalledOnce();
    });

    const cyclic = { title: [] as unknown[] };
    cyclic.title.push(cyclic);

    it.each([
      [
        'past the depth limit',
        { title: nested(MAX_INPUT_DEPTH) },
        `The input nests deeper than ${MAX_INPUT_DEPTH} levels.`,
      ],
      ['that contains itself', cyclic, 'The input contains itself.'],
    ])(
      'refuses view input %s before the view sees it',
      async (_label, input, reason) => {
        const { request, spied } = requestSpy();
        const result = await call(spied, ISOMER_TOOL_NAMES.requestView, {
          id: 'one-slide',
          input,
        });
        expect(request).not.toHaveBeenCalled();
        expect(result.isError).toBe(true);
        expect(jsonOf(result)).toEqual({
          error: 'Invalid input for view "one-slide":',
          errors: [reason],
        });
      }
    );

    const viewTools = (
      build: (context: unknown) => Composition | Promise<Composition>,
      hostContext?: unknown
    ) =>
      createIsomerTools({
        runtime: createIsomerRuntime({
          packs: [slidesPack],
          views: [
            defineView({
              id: 'built',
              title: 'Built',
              answers: [],
              build: ({ context }) => build(context),
            }),
          ],
        }),
        frame: slideDeckFrame,
        hostContext,
      });

    it('passes hostContext to the view', async () => {
      const build = vi.fn(() => oneSlide as Composition);
      await call(
        viewTools(build, { user: 'a' }),
        ISOMER_TOOL_NAMES.requestView,
        {
          id: 'built',
        }
      );
      expect(build).toHaveBeenCalledWith({ user: 'a' });
    });

    it('returns a built composition that breaks the frame rule, not as a failed call', async () => {
      const result = await call(
        viewTools(
          () => ({ type: 'view', body: [slide, slide] }) as Composition
        ),
        ISOMER_TOOL_NAMES.requestView,
        { id: 'built' }
      );
      expect(result.isError).toBeUndefined();
      expect(jsonOf(result)).toMatchObject({
        valid: false,
        errors: [expect.stringMatching(FRAME_RULE)],
      });
    });

    it('reports a composition validation error from a view as its findings', async () => {
      const result = await call(
        viewTools(() => {
          throw new CompositionValidationError([
            { path: 'body[0].title', message: 'is required' },
          ]);
        }),
        ISOMER_TOOL_NAMES.requestView,
        { id: 'built' }
      );
      expect(result.isError).toBe(true);
      expect(jsonOf(result)).toEqual({
        error: 'Invalid Composition:',
        errors: ['body[0].title is required'],
      });
    });

    it.each([
      [
        'a look-alike with the wrong code',
        Object.assign(new Error('Looks invalid'), {
          name: 'CompositionValidationError',
          code: 'SOMETHING_ELSE',
          errors: [{ path: 'body[0]', message: 'is wrong' }],
        }),
        'Looks invalid',
      ],
      [
        'a validation error with no findings',
        Object.assign(new Error('Invalid input'), {
          name: 'RegisteredViewInputError',
          code: ISOMER_ERROR_CODES.VIEW_INPUT_INVALID,
          errors: [],
        }),
        'Invalid input',
      ],
    ])('reports %s as its message', async (_label, error, message) => {
      const result = await call(
        viewTools(() => {
          throw error;
        }),
        ISOMER_TOOL_NAMES.requestView,
        { id: 'built' }
      );
      expect(result).toEqual({
        content: [{ type: 'text', text: message }],
        isError: true,
      });
    });

    it('bounds the length of the view id', () => {
      const { inputSchema } = tools.find(
        ({ name }) => name === ISOMER_TOOL_NAMES.requestView
      )!;
      const parses = (id: string) => inputSchema.safeParse({ id }).success;
      expect(parses('')).toBe(false);
      expect(parses('x'.repeat(200))).toBe(true);
      expect(parses('x'.repeat(201))).toBe(false);
    });

    it('reports an unknown view as a failed call', async () => {
      const result = await call(tools, ISOMER_TOOL_NAMES.requestView, {
        id: 'missing',
      });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain('missing');
    });
  });
});

describe('a throwing runtime', () => {
  const throwing = (thrown: unknown) => (): never => {
    throw thrown;
  };

  it.each([
    [ISOMER_TOOL_NAMES.authoringGuide, 'getAuthoringContext', {}],
    [
      ISOMER_TOOL_NAMES.describePrimitives,
      'getAuthoringContext',
      { types: ['slideFrame'] },
    ],
    [ISOMER_TOOL_NAMES.validate, 'parse', { composition: oneSlide }],
    [
      ISOMER_TOOL_NAMES.render,
      'parse',
      { composition: oneSlide, surface: 'text' },
    ],
  ] as const)('%s resolves to a failed call', async (name, method, args) => {
    const tools = createIsomerTools({
      runtime: { ...runtime, [method]: throwing(new Error('offline')) },
    });
    await expect(call(tools, name, args)).resolves.toEqual({
      content: [{ type: 'text', text: 'offline' }],
      isError: true,
    });
  });

  it.each([
    ['an object with no prototype', Object.create(null) as unknown],
    ['a string', 'plain failure'],
    ['undefined', undefined],
  ])('reports a thrown %s without throwing again', async (_label, thrown) => {
    const tools = createIsomerTools({
      runtime: { ...runtime, parse: throwing(thrown) },
    });
    const result = call(tools, ISOMER_TOOL_NAMES.validate, {
      composition: oneSlide,
    });
    await expect(result).resolves.toMatchObject({ isError: true });
  });
});

describe('checkComposition', () => {
  it('keeps each error structured beside its string', () => {
    const { valid, errors, findings } = checkComposition(
      runtime,
      slideDeckFrame,
      { type: 'view', body: [{ ...slide, nope: 1 }] }
    );
    expect(valid).toBe(false);
    expect(findings).toEqual([
      expect.objectContaining({ path: 'body[0]', nodeType: 'slideFrame' }),
    ]);
    expect(errors).toEqual(findings.map(formatValidationError));
  });

  it('prints each warning with its surface and path once', () => {
    const { warnings } = checkComposition(
      {
        ...runtime,
        validate: () => ({
          valid: true,
          errors: [],
          warnings: [
            {
              surface: 'svg',
              path: 'body[0]',
              message: 'body[0] type "slideFrame" declares no svgHeight metric',
            },
            {
              surface: 'slack',
              path: 'body[0].body[1]',
              message: 'draws nothing',
            },
            { surface: 'text', message: 'is empty' },
          ],
        }),
      },
      undefined,
      oneSlide
    );
    expect(warnings).toEqual([
      'svg: body[0] type "slideFrame" declares no svgHeight metric',
      'slack: body[0].body[1] draws nothing',
      'text: is empty',
    ]);
  });

  it('reports a frame rule as a finding with an empty path', () => {
    const { findings } = checkComposition(runtime, slideDeckFrame, {
      type: 'view',
      body: [slide, slide],
    });
    expect(findings.map(({ path }) => path)).toEqual(['']);
    expect(findings[0]?.message).toMatch(FRAME_RULE);
  });
});

describe('structural contracts', () => {
  it('an IsomerRuntime satisfies IsomerToolsRuntime, with or without frames', () => {
    expectTypeOf<IsomerRuntime>().toMatchTypeOf<IsomerToolsRuntime>();
    expectTypeOf(runtime).toMatchTypeOf<IsomerToolsRuntime>();
    expectTypeOf(
      createIsomerRuntime({ packs: [slidesPack] })
    ).toMatchTypeOf<IsomerToolsRuntime>();
  });

  it('an SDK Frame satisfies IsomerToolsFrame', () => {
    expectTypeOf(slideDeckFrame).toMatchTypeOf<IsomerToolsFrame>();
  });

  it('requires hostContext when the runtime’s context excludes undefined', () => {
    const typed = runtime as unknown as IsomerRuntime<{ user: string }>;
    // @ts-expect-error `hostContext` is required for this runtime.
    createIsomerTools({ runtime: typed });
    createIsomerTools({ runtime: typed, hostContext: { user: 'a' } });
  });
});
