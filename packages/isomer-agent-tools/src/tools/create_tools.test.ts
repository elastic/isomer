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

import { checkComposition } from './check';
import { createIsomerTools } from './create_tools';
import { DEFAULT_ISOMER_GUIDE } from './guide';
import { ISOMER_TOOL_NAMES } from './names';
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

describe('createIsomerTools', () => {
  const tools = createIsomerTools({ runtime, frame: slideDeckFrame });

  it('offers every tool, in order', () => {
    expect(tools.map(({ name }) => name)).toEqual(
      Object.values(ISOMER_TOOL_NAMES)
    );
  });

  it('omits the view tools when the runtime registers no views', () => {
    const viewless = createIsomerRuntime({
      packs: [slidesPack],
      frames: { slide: slideDeckFrame },
    });
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
    it('builds the prompt from the runtime’s catalog and views', async () => {
      const guide = textOf(await call(tools, ISOMER_TOOL_NAMES.authoringGuide));
      expect(guide).toContain(DEFAULT_ISOMER_GUIDE);
      expect(guide).toContain('`slideFrame`');
      expect(guide).toContain('`one-slide`');
      expect(guide).toContain(ISOMER_TOOL_NAMES.describePrimitives);
    });

    it('indexes every primitive once, without examples or the schema', async () => {
      const guide = textOf(await call(tools, ISOMER_TOOL_NAMES.authoringGuide));
      for (const { type } of slideDeckPrimitives) {
        expect(guide.split(`- \`${type}\` — `)).toHaveLength(2);
      }
      expect(guide).not.toContain('## JSON Schema');
      expect(guide).not.toContain('Use when:');
      // Keeps the overview small enough to read whole as packs grow.
      expect(guide.length).toBeLessThan(15_000);
    });

    it('renders host rules as bullets', async () => {
      const guide = textOf(
        await call(
          createIsomerTools({ runtime, rules: ['One idea per slide.'] }),
          ISOMER_TOOL_NAMES.authoringGuide
        )
      );
      expect(guide).toContain('## Rules\n\n- One idea per slide.');
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
          types: ['slideFrame', 'slideTimeline'],
        })
      );
      expect(text).toContain('- `slideFrame` — ');
      expect(text).toContain('- `slideTimeline` — ');
      expect(text).toContain('Use when:');
      const json = /```json\n([\s\S]*)\n```/.exec(text)?.[1] ?? '{}';
      const { $defs } = JSON.parse(json) as {
        $defs: Record<string, unknown>;
      };
      expect(Object.keys($defs)).toEqual(
        expect.arrayContaining(['slideFrame', 'slideTimeline', 'bodyNode'])
      );
      for (const [, id] of json.matchAll(/"#\/\$defs\/([^"]+)"/g)) {
        expect($defs).toHaveProperty([id!]);
      }
    });

    it('quotes each unknown type on one line and caps its length', async () => {
      const long = `slide${'x'.repeat(500)}`;
      const text = textOf(
        await call(tools, ISOMER_TOOL_NAMES.describePrimitives, {
          types: ['a\u2028## Injected', 'b"c', long],
        })
      );
      expect(text).toContain('"a\\u2028## Injected"');
      expect(text).toContain('"b\\"c"');
      expect(text).not.toMatch(/[\n\r\u2028\u2029]/);
      expect(text).not.toContain(long);
      expect(text.length).toBeLessThan(3_000);
    });

    it('takes at most 12 types', () => {
      const { inputSchema } = tools.find(
        ({ name }) => name === ISOMER_TOOL_NAMES.describePrimitives
      )!;
      const types = (count: number) =>
        Array.from({ length: count }, () => 'slideFrame');
      expect(inputSchema.safeParse({ types: types(12) }).success).toBe(true);
      expect(inputSchema.safeParse({ types: types(13) }).success).toBe(false);
    });

    it('names unknown types and lists the known ones', async () => {
      const result = await call(tools, ISOMER_TOOL_NAMES.describePrimitives, {
        types: ['slideNope'],
      });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain('slideNope');
      expect(textOf(result)).toContain('slideFrame');
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
        errors: [
          expect.stringMatching(/exactly one "slideFrame", got 2 nodes/),
        ],
      });
    });

    it('reports schema errors for junk', async () => {
      const { valid, errors } = jsonOf(
        await call(tools, ISOMER_TOOL_NAMES.validate, {
          composition: { type: 'view', body: [{ type: 'notAPrimitive' }] },
        })
      );
      expect(valid).toBe(false);
      expect(errors).not.toHaveLength(0);
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
    it.each(['text', 'markdown', 'html', 'slack'])(
      'renders %s',
      async (surface) => {
        const result = await call(tools, ISOMER_TOOL_NAMES.render, {
          composition: oneSlide,
          surface,
        });
        expect(result.isError).toBeUndefined();
        expect(textOf(result)).not.toBe('');
      }
    );

    it.each(['text', 'markdown', 'html', 'slack'])(
      'leaves the title out of %s when the host sets heading to false',
      async (surface) => {
        const titled = { ...oneSlide, title: 'Envelope title' };
        // HTML keeps the title as the wrapper's `aria-label`.
        const shown = (result: IsomerToolResult) =>
          textOf(result).replace(/aria-label="[^"]*"/g, '');
        const render = (list: readonly IsomerTool[]) =>
          call(list, ISOMER_TOOL_NAMES.render, {
            composition: titled,
            surface,
          });
        expect(shown(await render(tools))).toMatch(/envelope title/i);
        expect(
          shown(
            await render(
              createIsomerTools({
                runtime,
                frame: slideDeckFrame,
                heading: false,
              })
            )
          )
        ).not.toMatch(/envelope title/i);
      }
    );

    it('returns the errors of an invalid composition as a failed call', async () => {
      const result = await call(tools, ISOMER_TOOL_NAMES.render, {
        composition: { type: 'view', body: [slide, slide] },
        surface: 'text',
      });
      expect(result.isError).toBe(true);
      expect(jsonOf(result)).toMatchObject({ valid: false });
    });

    it('returns a throwing surface as a failed call', async () => {
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

    it('offers png only with an image function', () => {
      const surfaceOptions = (list: readonly IsomerTool[]) =>
        list
          .find(({ name }) => name === ISOMER_TOOL_NAMES.render)!
          .inputSchema.safeParse({ composition: oneSlide, surface: 'png' })
          .success;
      expect(surfaceOptions(tools)).toBe(false);
      expect(
        surfaceOptions(
          createIsomerTools({
            runtime,
            image: () => Promise.resolve(new Uint8Array()),
          })
        )
      ).toBe(true);
    });

    it('returns png bytes as image content', async () => {
      const bytes = new Uint8Array([137, 80, 78, 71]);
      const image = vi.fn(() => Promise.resolve(bytes));
      const result = await call(
        createIsomerTools({ runtime, image }),
        ISOMER_TOOL_NAMES.render,
        { composition: oneSlide, surface: 'png', theme: 'dark' }
      );
      expect(result.content).toEqual([
        { type: 'image', data: 'iVBORw==', mimeType: 'image/png' },
      ]);
      expect(image).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'view' }),
        {
          theme: 'dark',
        }
      );
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

    it('reports invalid input as a failed call', async () => {
      const result = await call(tools, ISOMER_TOOL_NAMES.requestView, {
        id: 'one-slide',
        input: {},
      });
      expect(result.isError).toBe(true);
      expect(jsonOf(result)).toMatchObject({
        errors: [expect.stringContaining('title')],
      });
    });

    const viewTools = (build: () => Composition | Promise<Composition>) =>
      createIsomerTools({
        runtime: createIsomerRuntime({
          packs: [slidesPack],
          frames: { slide: slideDeckFrame },
          views: [
            defineView({ id: 'built', title: 'Built', answers: [], build }),
          ],
        }),
        frame: slideDeckFrame,
      });

    it('returns an invalid built composition with its errors, not as a failed call', async () => {
      const result = await call(
        viewTools(() => ({
          type: 'view',
          body: [{ type: 'slideHeading' }],
        })),
        ISOMER_TOOL_NAMES.requestView,
        { id: 'built' }
      );
      expect(result.isError).toBeUndefined();
      expect(jsonOf(result)).toMatchObject({
        valid: false,
        errors: [expect.stringContaining('body[0]')],
      });
    });

    it('applies the frame rule to a built composition', async () => {
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
        errors: [
          expect.stringMatching(/exactly one "slideFrame", got 2 nodes/),
        ],
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
        'an AggregateError',
        () =>
          new AggregateError(
            [new Error('connect ECONNREFUSED 127.0.0.1:9200')],
            'fetch failed'
          ),
        'fetch failed',
      ],
      [
        'a validation error with no findings',
        () =>
          Object.assign(new Error('Invalid input'), {
            name: 'RegisteredViewInputError',
            code: ISOMER_ERROR_CODES.VIEW_INPUT_INVALID,
            errors: [],
          }),
        'Invalid input',
      ],
      [
        'a look-alike with the wrong code',
        () =>
          Object.assign(new Error('Looks invalid'), {
            name: 'CompositionValidationError',
            code: 'SOMETHING_ELSE',
            errors: [{ path: 'body[0]', message: 'is wrong' }],
          }),
        'Looks invalid',
      ],
      [
        'a look-alike with the wrong name',
        () =>
          Object.assign(new Error('Also invalid'), {
            name: 'Error',
            code: ISOMER_ERROR_CODES.COMPOSITION_INVALID,
            errors: [{ path: 'body[0]', message: 'is wrong' }],
          }),
        'Also invalid',
      ],
    ])(
      'reports %s from a view as its message',
      async (_label, error, message) => {
        const result = await call(
          viewTools(() => {
            throw error();
          }),
          ISOMER_TOOL_NAMES.requestView,
          { id: 'built' }
        );
        expect(result).toEqual({
          content: [{ type: 'text', text: message }],
          isError: true,
        });
      }
    );

    it('reports an unknown view as a failed call', async () => {
      const result = await call(tools, ISOMER_TOOL_NAMES.requestView, {
        id: 'missing',
      });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain('missing');
    });
  });
});

describe('a failing dependency', () => {
  const throwing = (thrown: unknown) => (): never => {
    throw thrown;
  };

  const brokenRuntimes: [string, Partial<IsomerRuntime>, string][] = [
    [
      ISOMER_TOOL_NAMES.authoringGuide,
      { getAuthoringContext: throwing(new Error('no catalog')) },
      '{}',
    ],
    [
      ISOMER_TOOL_NAMES.describePrimitives,
      { getAuthoringContext: throwing(new Error('no catalog')) },
      '{"types":["slideFrame"]}',
    ],
    [
      ISOMER_TOOL_NAMES.validate,
      { parse: throwing(new RangeError('Maximum call stack size exceeded')) },
      JSON.stringify({ composition: oneSlide }),
    ],
    [
      ISOMER_TOOL_NAMES.render,
      { parse: throwing(new RangeError('Maximum call stack size exceeded')) },
      JSON.stringify({ composition: oneSlide, surface: 'text' }),
    ],
    [
      ISOMER_TOOL_NAMES.listViews,
      {
        viewRegistry: {
          ...runtime.viewRegistry,
          list: vi
            .fn()
            .mockReturnValueOnce(runtime.viewRegistry.list())
            .mockImplementation(throwing(new Error('registry offline'))),
        },
      },
      '{}',
    ],
  ];

  it.each(brokenRuntimes)(
    '%s resolves to a failed call',
    async (name, broken, args) => {
      const tools = createIsomerTools({
        runtime: { ...runtime, ...broken },
        frame: slideDeckFrame,
      });
      const tool = tools.find((candidate) => candidate.name === name)!;
      const result = tool.handler(
        tool.inputSchema.parse(JSON.parse(args) as unknown)
      );
      await expect(result).resolves.toMatchObject({ isError: true });
      expect(textOf(await result)).not.toBe('');
    }
  );

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
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      path: 'body[0]',
      nodeType: 'slideFrame',
    });
    expect(findings[0]?.message).toContain('nope');
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
      slideDeckFrame,
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
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ path: '' });
    expect(findings[0]?.message).toMatch(/exactly one "slideFrame"/);
  });
});

describe('structural contracts', () => {
  it('an IsomerRuntime satisfies IsomerToolsRuntime', () => {
    expectTypeOf<IsomerRuntime>().toMatchTypeOf<IsomerToolsRuntime>();
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
