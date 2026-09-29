/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';
import type { SlideBulletListNode } from '../../primitives/slide_bullet_list';
import type { SlideFrameNode } from '../../primitives/slide_frame';

import { deckFonts, symbolFont } from './fonts';
import { deck } from './index';

const outputDir = join(dirname(fileURLToPath(import.meta.url)), 'output');

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const takumi = createTakumiImageBackend({ fonts: deckFonts });

// `toMatchFileSnapshot` is text-only, so binary artifacts hand-roll its
// behaviour. Byte comparison is CI-only: a takumi or font bump changes every
// artifact, and asserting locally would fail on that alone rather than on a
// real regression. A local run always refreshes the artifact instead;
// `git diff` on the files is the review step for that bump.
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

const bullets = (
  marker: SlideBulletListNode['marker'],
  item: string
): SlideBulletListNode => ({ type: 'slideBulletList', marker, items: [item] });

/** Every marker the theme draws as a glyph, none of which Inter covers. */
const markerSlide: SlideFrameNode = {
  type: 'slideFrame',
  chapter: 'Markers',
  footer: 'Elastic',
  body: [bullets('check', 'Covered'), bullets('x', 'Also covered')],
};
const markers: Composition = {
  type: 'view',
  title: 'Markers',
  body: [markerSlide],
};

describe('deck examples', () => {
  for (const [index, composition] of deck.entries()) {
    const slug = composition.title
      ? composition.title.toLowerCase().replace(/\s+/g, '-')
      : `slide-${index}`;

    it(`${slug}: html`, async () => {
      const result = runtime.surfaces.html.render(composition);
      await expect(result.html).toMatchFileSnapshot(
        join(outputDir, `${slug}.html`)
      );
    });

    it(`${slug}: markdown`, async () => {
      const md = runtime.surfaces.markdown.render(composition);
      await expect(md).toMatchFileSnapshot(join(outputDir, `${slug}.md`));
    });

    it(`${slug}: text`, async () => {
      const text = runtime.surfaces.text.render(composition);
      await expect(text).toMatchFileSnapshot(join(outputDir, `${slug}.txt`));
    });

    it(`${slug}: slack`, async () => {
      const result = runtime.surfaces.slack.render(composition);
      await expect(JSON.stringify(result.blocks, null, 2)).toMatchFileSnapshot(
        join(outputDir, `${slug}.slack.json`)
      );
    });

    // The image surface's own artifact: the tree an image backend lays out,
    // plus the stylesheet it is given, with `light-dark(…)` already resolved.
    // Openable in a browser, which is what makes it reviewable.
    it(`${slug}: svg-html`, async () => {
      const { element, css } = runtime.surfaces.svg.render(composition);
      const markup = `<style>${css}</style>${renderToStaticMarkup(element)}`;
      await expect(markup).toMatchFileSnapshot(
        join(outputDir, `${slug}.svg.html`)
      );
    });

    it(`${slug}: png`, async () => {
      const png = await takumi.png(runtime.surfaces.svg.render(composition));
      expectArtifact(`${slug}.png`, png);
    });
  }

  it('deck: pdf', async () => {
    const pdf = await takumi.pdf(runtime.surfaces.svg.renderPages(deck), {
      // Fixed, so the committed bytes do not carry the render time.
      metadata: { title: 'Isomer', creationDate: '2026-01-01T00:00:00' },
    });

    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(pdf.toString('latin1')).toMatch(/\/Count 5\b/);
    expectArtifact('deck.pdf', pdf);
  });

  // A PDF rejects a glyph no registered font covers, so rendering at all
  // proves the symbol face reaches the theme's markers.
  it('pdf draws the check and cross markers from the symbol face', async () => {
    const pages = runtime.surfaces.svg.renderPages([markers]);
    const withoutSymbols = createTakumiImageBackend({
      fonts: deckFonts.filter((font) => font !== symbolFont),
    });

    await expect(withoutSymbols.pdf(pages)).rejects.toThrow(/U\+2713/);
    const pdf = await takumi.pdf(pages);
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });
});
