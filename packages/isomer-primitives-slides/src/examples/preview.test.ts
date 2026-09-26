/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Dev-only preview: `SLIDE_PREVIEW=slideSection,slideTimeline pnpm vitest run
// packages/isomer-primitives-slides/src/examples/preview.test.ts` writes each
// named primitive's examples as PNGs to `SLIDE_PREVIEW_OUT`.
// `SLIDE_PREVIEW_FILE=compositions.json` renders a JSON array of compositions
// instead. Skipped when neither is set.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../pack';
import { slideDeckPrimitives } from '../registry';

import { deckFonts } from './deck/fonts';
import { previewSlide } from './preview_slide';

const requested = process.env.SLIDE_PREVIEW?.split(',').filter(Boolean) ?? [];
const file = process.env.SLIDE_PREVIEW_FILE;
const out = process.env.SLIDE_PREVIEW_OUT ?? join(tmpdir(), 'slide-preview');

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});
const takumi = createTakumiImageBackend({ fonts: deckFonts });

const compose = previewSlide;

const write = async (name: string, composition: Composition) => {
  const validation = runtime.validate(composition);
  expect(validation.errors, name).toEqual([]);
  for (const theme of ['light', 'dark'] as const) {
    const png = await takumi.png(
      runtime.surfaces.svg.render(composition, { theme })
    );
    writeFileSync(join(out, `${name}.${theme}.png`), png);
  }
  writeFileSync(
    join(out, `${name}.txt`),
    [
      runtime.surfaces.text.render(composition, { heading: false }),
      '---- markdown',
      runtime.surfaces.markdown.render(composition, { heading: false }),
      '---- slack',
      JSON.stringify(
        runtime.surfaces.slack.render(composition, { heading: false }).blocks,
        null,
        2
      ),
    ].join('\n')
  );
};

describe.skipIf(requested.length === 0 && !file)('slide preview', () => {
  mkdirSync(out, { recursive: true });
  for (const type of requested) {
    const definition = slideDeckPrimitives.find((entry) => entry.type === type);
    it(type, async () => {
      expect(definition, type).toBeDefined();
      for (const [index, example] of definition!.examples.entries()) {
        await write(`${type}-${index}`, compose(example));
      }
    });
  }
  if (file) {
    it(file, async () => {
      const compositions = JSON.parse(
        readFileSync(file, 'utf8')
      ) as Composition[];
      for (const [index, composition] of compositions.entries()) {
        await write(`file-${index}`, composition);
      }
    });
  }
});
