/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import {
  createTakumiImageBackend,
  type PdfInput,
  type TakumiPdfBackend,
} from './backend';
import { type PdfRuntime, renderPdf } from './render_pdf';

/** Stands in for `IsomerRuntime`: validates by a fixed rule, renders one box per composition. */
const runtimeReturning = (
  validation: (composition: unknown) => { valid: boolean; errors: [] },
  seen: (options: unknown) => void = () => undefined
): PdfRuntime => ({
  validate: (composition) => ({ ...validation(composition), composition }),
  surfaces: {
    svg: {
      renderPages: (compositions, options) => {
        seen(options);
        return {
          pages: compositions.map((_composition, index) =>
            createElement('div', { className: 'box' }, `Page ${index}`)
          ),
          css: '.box { background: #ff0000; }',
          width: 64,
          height: 32,
        };
      },
    },
  },
});

const valid = () => ({ valid: true, errors: [] as [] });

describe('renderPdf', () => {
  it('takes a custom backend with only pdf', async () => {
    const takumi = createTakumiImageBackend();
    const backend: TakumiPdfBackend = {
      pdf: (input, options) => takumi.pdf(input, options),
    };

    const result = await renderPdf(
      runtimeReturning(valid),
      [{ type: 'view' }, { type: 'view' }],
      backend
    );

    expect(result.pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(result.pdf.toString('latin1')).toMatch(/\/Count 2\b/);
    expect(result).toMatchObject({ pageCount: 2, width: 64, height: 32 });
  });

  it('draws the copies validation checked', async () => {
    let drawn: readonly unknown[] = [];
    const runtime: PdfRuntime = {
      validate: (composition) => ({
        valid: true,
        errors: [],
        composition: { copy: composition },
      }),
      surfaces: {
        svg: {
          renderPages: (compositions) => {
            drawn = compositions;
            return {
              pages: compositions.map(() => createElement('div', null, 'Ag')),
              css: '',
              width: 64,
              height: 32,
            };
          },
        },
      },
    };
    const deck = [{ type: 'view' }, { type: 'view', title: 'two' }];

    const result = await renderPdf(runtime, deck, createTakumiImageBackend());

    expect(drawn).toEqual(deck.map((composition) => ({ copy: composition })));
    expect(result.validations).toEqual([
      { valid: true, errors: [] },
      { valid: true, errors: [] },
    ]);
  });

  it('throws rather than draw a page the runtime returned no copy of', async () => {
    let drawn = false;
    const runtime: PdfRuntime = {
      validate: (composition) => ({
        valid: true,
        errors: [],
        composition: (composition as { title?: string }).title
          ? undefined
          : composition,
      }),
      surfaces: {
        svg: {
          renderPages: () => {
            drawn = true;
            return { pages: [], css: '', width: 1, height: 1 };
          },
        },
      },
    };

    await expect(
      renderPdf(
        runtime,
        [{ type: 'view' }, { type: 'view', title: 'unchecked' }],
        createTakumiImageBackend()
      )
    ).rejects.toThrow(
      'renderPdf: runtime.validate returned no checked composition'
    );
    expect(drawn).toBe(false);
  });

  it('renders every composition and reports each validation in order', async () => {
    const invalid = { type: 'view', title: 'broken' };
    const runtime = runtimeReturning((composition) =>
      composition === invalid
        ? { valid: false, errors: [] }
        : { valid: true, errors: [] }
    );

    const result = await renderPdf(
      runtime,
      [{ type: 'view' }, invalid],
      createTakumiImageBackend()
    );

    expect(result.pageCount).toBe(2);
    expect(result.validations.map(({ valid: ok }) => ok)).toEqual([
      true,
      false,
    ]);
  });

  it('forwards svg options and collects rather than throws', async () => {
    let seenSvgOptions: unknown;
    let seenInput: PdfInput | undefined;
    const backend: TakumiPdfBackend = {
      pdf: (input) => {
        seenInput = input;
        return Promise.resolve(Buffer.alloc(0));
      },
    };

    await renderPdf(
      runtimeReturning(valid, (options) => {
        seenSvgOptions = options;
      }),
      [{ type: 'view' }],
      backend,
      { svg: { frame: 'card' }, metadata: { title: 'Deck' } }
    );

    expect(seenSvgOptions).toMatchObject({
      frame: 'card',
      onValidationError: 'collect',
    });
    expect(seenInput).toMatchObject({ width: 64, height: 32 });
    expect(seenInput?.pages).toHaveLength(1);
  });
});
