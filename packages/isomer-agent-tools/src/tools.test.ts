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
  MAX_INPUT_CHARACTERS,
  MAX_INPUT_DEPTH,
} from '@elastic/isomer-sdk';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { z } from 'zod';

import { checkComposition } from './check';
import { ISOMER_TOOL_NAMES } from './names';
import { createIsomerTools } from './tools';
import type {
  IsomerTool,
  IsomerToolResult,
  IsomerToolsFormat,
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

const recordValidate = () => {
  const validated: unknown[] = [];
  const validate = (composition: Composition) => {
    const result = runtime.validate(composition);
    validated.push(result.composition);
    return result;
  };
  return { validate, validated };
};

const TOO_DEEP = `input nests deeper than ${MAX_INPUT_DEPTH} levels`;

const NOT_PLAIN_OBJECT =
  'input holds an object that is not a plain object or array, which is not plain data';

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
      expect(errors).not.toContain(TOO_DEEP);
    });

    it.each([
      ['past the depth limit', stackOfDepth(MAX_INPUT_DEPTH + 1), TOO_DEEP],
      [
        'that is not plain data',
        { ...oneSlide, meta: { at: new Date(0) } },
        NOT_PLAIN_OBJECT,
      ],
    ])(
      'reports the runtime’s refusal of a composition %s without failing the call',
      async (_label, composition, reason) => {
        const result = await call(tools, ISOMER_TOOL_NAMES.validate, {
          composition,
        });
        expect(result.isError).toBeUndefined();
        expect(jsonOf(result)).toEqual({
          valid: false,
          errors: [reason],
          warnings: [],
        });
      }
    );

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
    const formats = ['text', 'markdown', 'html', 'slack'];

    it.each(formats)('renders %s', async (format) => {
      const result = await call(tools, ISOMER_TOOL_NAMES.render, {
        composition: oneSlide,
        format,
      });
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).not.toBe('');
    });

    it.each(formats)(
      'leaves the title out of %s when heading is false',
      async (format) => {
        const titled = { ...oneSlide, title: 'Envelope title' };
        // HTML keeps the title as the wrapper's `aria-label`.
        const shown = async (list: readonly IsomerTool[]) =>
          textOf(
            await call(list, ISOMER_TOOL_NAMES.render, {
              composition: titled,
              format,
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
        format: 'text',
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
            format: 'html',
            ...(theme === undefined ? {} : { theme }),
          })
        );
        expect(html).toContain(attribute);
        expect(html).toContain('<style>');
      }
    );

    it.each([
      [
        'over the input budget',
        { ...oneSlide, title: 'x'.repeat(MAX_INPUT_CHARACTERS) },
        `input holds more than ${MAX_INPUT_CHARACTERS} characters`,
      ],
      [
        'that is not plain data',
        { ...oneSlide, meta: { at: new Date(0) } },
        NOT_PLAIN_OBJECT,
      ],
    ])(
      'returns a composition %s as a failed call',
      async (_label, composition, reason) => {
        const result = await call(tools, ISOMER_TOOL_NAMES.render, {
          composition,
          format: 'text',
        });
        expect(result.isError).toBe(true);
        expect(jsonOf(result)).toEqual({ valid: false, errors: [reason] });
      }
    );

    const decode = (data: string) =>
      Uint8Array.from(atob(data), (char) => char.charCodeAt(0));

    const png = (
      render: IsomerToolsFormat['render'] = () =>
        Promise.resolve(new Uint8Array())
    ): IsomerToolsFormat => ({ mimeType: 'image/png', render });

    it('renders a host format from the copy the runtime validated', async () => {
      const { validate, validated } = recordValidate();
      const render = vi.fn((_composition: Composition) =>
        Promise.resolve(new Uint8Array())
      );
      await call(
        createIsomerTools({
          runtime: { ...runtime, validate },
          formats: { png: png(render) },
        }),
        ISOMER_TOOL_NAMES.render,
        { composition: oneSlide, format: 'png' }
      );
      expect(validated).toHaveLength(1);
      expect(render.mock.calls[0]?.[0]).toBe(validated[0]);
    });

    it('offers the runtime formats, then each host format', () => {
      const renderTool = (list: readonly IsomerTool[]) =>
        list.find(({ name }) => name === ISOMER_TOOL_NAMES.render)!;
      const accepts = (list: readonly IsomerTool[], format: string) =>
        renderTool(list).inputSchema.safeParse({
          composition: oneSlide,
          format,
        }).success;
      const withFormats = createIsomerTools({
        runtime,
        formats: { png: png(), pdf: { ...png(), mimeType: 'application/pdf' } },
      });
      expect(accepts(tools, 'png')).toBe(false);
      expect(accepts(withFormats, 'png')).toBe(true);
      expect(accepts(withFormats, 'pdf')).toBe(true);
      expect(renderTool(withFormats).description).toContain(
        '`text`, `markdown`, `html`, `slack`, `png`, `pdf`'
      );
    });

    it('refuses a host format named like a runtime format', () => {
      try {
        createIsomerTools({ runtime, formats: { html: png(), png: png() } });
        expect.unreachable();
      } catch (error) {
        expect(error).toMatchObject({
          name: 'IsomerError',
          code: 'DUPLICATE_FORMAT',
        });
        expect((error as Error).message).toMatch(/^Host formats "html" shadow/);
      }
    });

    it('returns image bytes as base64 image content, past one chunk', async () => {
      const bytes = Uint8Array.from({ length: 0x8000 * 2 + 3 }, (_, i) => i);
      const render = vi.fn(() => Promise.resolve(bytes));
      const result = await call(
        createIsomerTools({ runtime, formats: { png: png(render) } }),
        ISOMER_TOOL_NAMES.render,
        { composition: oneSlide, format: 'png', theme: 'dark' }
      );
      const [block] = result.content;
      expect(block).toMatchObject({ type: 'image', mimeType: 'image/png' });
      expect(decode(block?.type === 'image' ? block.data : '')).toEqual(bytes);
      expect(render).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'view' }),
        { theme: 'dark' }
      );
    });

    it('returns image markup as image content', async () => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg"/>';
      const result = await call(
        createIsomerTools({
          runtime,
          formats: {
            svg: {
              mimeType: 'image/svg+xml',
              render: () => Promise.resolve(svg),
            },
          },
        }),
        ISOMER_TOOL_NAMES.render,
        { composition: oneSlide, format: 'svg' }
      );
      const [block] = result.content;
      expect(block).toMatchObject({ type: 'image', mimeType: 'image/svg+xml' });
      expect(
        new TextDecoder().decode(
          decode(block?.type === 'image' ? block.data : '')
        )
      ).toBe(svg);
    });

    it('returns other bytes as an embedded resource and other strings as text', async () => {
      const bytes = Uint8Array.of(37, 80, 68, 70);
      const list = createIsomerTools({
        runtime,
        formats: {
          pdf: {
            mimeType: 'application/pdf',
            render: () => Promise.resolve(bytes),
          },
          csv: { mimeType: 'text/csv', render: () => Promise.resolve('a,b') },
        },
      });
      const pdf = await call(list, ISOMER_TOOL_NAMES.render, {
        composition: oneSlide,
        format: 'pdf',
      });
      expect(pdf.content).toEqual([
        {
          type: 'resource',
          resource: {
            uri: 'isomer://render/pdf',
            mimeType: 'application/pdf',
            blob: btoa('%PDF'),
          },
        },
      ]);
      const csv = await call(list, ISOMER_TOOL_NAMES.render, {
        composition: oneSlide,
        format: 'csv',
      });
      expect(csv).toEqual({ content: [{ type: 'text', text: 'a,b' }] });
    });

    it('returns a rejecting host format as a failed call', async () => {
      const result = await call(
        createIsomerTools({
          runtime,
          formats: {
            png: png(() => Promise.reject(new Error('rasterizer is down'))),
          },
        }),
        ISOMER_TOOL_NAMES.render,
        { composition: oneSlide, format: 'png' }
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

    it('passes view input at the depth limit to the view', async () => {
      const build = vi.fn(() => oneSlide as Composition);
      const title = nested(MAX_INPUT_DEPTH - 1);
      await call(viewTools(build), ISOMER_TOOL_NAMES.requestView, {
        id: 'built',
        input: { title },
      });
      expect(build).toHaveBeenCalledOnce();
    });

    const cyclic = { title: [] as unknown[] };
    cyclic.title.push(cyclic);

    it.each([
      ['past the depth limit', { title: nested(MAX_INPUT_DEPTH) }, TOO_DEEP],
      ['that contains itself', cyclic, 'input contains itself'],
      ['that is not plain data', { title: new Map() }, NOT_PLAIN_OBJECT],
    ])(
      'reports the runtime’s refusal of view input %s before the view sees it',
      async (_label, input, reason) => {
        const build = vi.fn(() => oneSlide as Composition);
        const result = await call(
          viewTools(build),
          ISOMER_TOOL_NAMES.requestView,
          {
            id: 'built',
            input,
          }
        );
        expect(build).not.toHaveBeenCalled();
        expect(result.isError).toBe(true);
        expect(jsonOf(result)).toEqual({
          error: 'Invalid input for view "built":',
          errors: [reason],
        });
      }
    );

    const cyclicBody: unknown[] = [];
    cyclicBody.push(cyclicBody);

    it.each([
      ['past the depth limit', nested(MAX_INPUT_DEPTH), TOO_DEEP],
      ['that contains itself', cyclicBody, 'input contains itself'],
    ])(
      'reports a built composition %s without echoing it',
      async (_label, body, reason) => {
        const result = await call(
          viewTools(() => ({ type: 'view', body }) as Composition),
          ISOMER_TOOL_NAMES.requestView,
          { id: 'built' }
        );
        expect(result.isError).toBeUndefined();
        expect(jsonOf(result)).toEqual({
          valid: false,
          errors: [reason],
          warnings: [],
        });
      }
    );

    it('returns a built composition that fails the schema with its findings', async () => {
      const result = await call(
        viewTools(
          () =>
            ({
              type: 'view',
              body: [{ ...slide, nope: 1 }],
            }) as unknown as Composition
        ),
        ISOMER_TOOL_NAMES.requestView,
        { id: 'built' }
      );
      expect(jsonOf(result)).toMatchObject({
        composition: { type: 'view', body: [{ nope: 1 }] },
        valid: false,
        errors: [expect.stringContaining('(in slideFrame)')],
      });
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
      { composition: oneSlide, format: 'text' },
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
        validate: (composition) => ({
          composition,
          valid: true,
          errors: [],
          warnings: [
            {
              surface: 'snapshot',
              path: 'body[0]',
              message:
                'body[0] type "slideFrame" declares no snapshotHeight metric',
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
      'snapshot: body[0] type "slideFrame" declares no snapshotHeight metric',
      'slack: body[0].body[1] draws nothing',
      'text: is empty',
    ]);
  });

  it.each([
    [
      'over the input budget',
      { type: 'view', body: nested(MAX_INPUT_DEPTH) },
      ISOMER_ERROR_CODES.INPUT_OVER_BUDGET,
    ],
    [
      'that is not plain data',
      { type: 'view', body: [() => slide] },
      ISOMER_ERROR_CODES.INPUT_NOT_PLAIN_DATA,
    ],
  ])(
    'keeps the code of the runtime’s refusal of a value %s',
    (_label, value, code) => {
      const { valid, findings, composition } = checkComposition(
        runtime,
        slideDeckFrame,
        value
      );
      expect(valid).toBe(false);
      expect(findings).toEqual([expect.objectContaining({ path: '', code })]);
      expect(composition).toBeUndefined();
    }
  );

  it('returns the copy the runtime validated', () => {
    const { validate, validated } = recordValidate();
    const { composition } = checkComposition(
      { ...runtime, validate },
      slideDeckFrame,
      oneSlide
    );
    expect(validated).toHaveLength(1);
    expect(composition).toBe(validated[0]);
    expect(composition).not.toBe(oneSlide);
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
