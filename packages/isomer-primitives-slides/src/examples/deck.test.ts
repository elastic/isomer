/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../pack';

import { deck, titleSlide } from './deck';
import { slideFonts } from './fonts';

const outputDir = join(dirname(fileURLToPath(import.meta.url)), 'output');

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const takumi = createTakumiImageBackend({ fonts: slideFonts });

// `toMatchFileSnapshot` is text-only. Bytes are compared in CI only, since a takumi or font bump changes every artifact; locally the file is rewritten and `git diff` is the review step.
const expectArtifact = (name: string, bytes: Buffer) => {
  const artifact = join(outputDir, name);
  if (!process.env.CI) {
    writeFileSync(artifact, bytes);
    return;
  }
  if (!existsSync(artifact)) {
    throw new Error(`missing artifact ${name}; run vitest locally to write it`);
  }
  expect(bytes.equals(readFileSync(artifact))).toBe(true);
};

describe('example deck', () => {
  it('validates every slide', () => {
    for (const slide of deck) {
      expect(runtime.validate(slide).errors).toEqual([]);
    }
  });

  // A slide opens with its own heading; the composition title only names it.
  it('title slide: markdown and text', async () => {
    await expect(
      runtime.surfaces.markdown.render(titleSlide, { heading: false })
    ).toMatchFileSnapshot(join(outputDir, 'title-slide.md'));
    await expect(
      runtime.surfaces.text.render(titleSlide, { heading: false })
    ).toMatchFileSnapshot(join(outputDir, 'title-slide.txt'));
  });

  it('title slide: png', async () => {
    expectArtifact(
      'title-slide.png',
      await takumi.png(runtime.surfaces.svg.render(titleSlide))
    );
  });

  it('deck: pdf', async () => {
    const pdf = await takumi.pdf(runtime.surfaces.svg.renderPages(deck), {
      // Fixed, so the committed bytes do not carry the render time.
      metadata: { title: 'Isomer', creationDate: '2026-01-01T00:00:00' },
    });
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.toString('latin1')).toMatch(/\/Count 2\b/);
    expectArtifact('deck.pdf', pdf);
  });
});
