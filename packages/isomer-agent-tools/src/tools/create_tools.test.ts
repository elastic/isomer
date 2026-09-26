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
import type { Composition } from '@elastic/isomer-sdk';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { z } from 'zod';

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

    it('reports an unknown view as a failed call', async () => {
      const result = await call(tools, ISOMER_TOOL_NAMES.requestView, {
        id: 'missing',
      });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain('missing');
    });
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
