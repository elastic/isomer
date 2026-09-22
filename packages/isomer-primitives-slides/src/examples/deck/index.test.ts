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
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';

import { deckFonts } from './fonts';
import { deck } from './index';

const outputDir = join(dirname(fileURLToPath(import.meta.url)), 'output');

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const takumi = createTakumiImageBackend({ fonts: deckFonts });

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

    // `toMatchFileSnapshot` is text-only, so this hand-rolls its behaviour.
    // Byte comparison is CI-only: a takumi or font bump changes every PNG,
    // and asserting locally would fail on that alone rather than on a real
    // regression. A local run always refreshes the artifact instead;
    // `git diff` on the five files is the review step for that bump.
    it(`${slug}: png`, async () => {
      const png = await takumi.png(runtime.surfaces.svg.render(composition));
      const artifact = join(outputDir, `${slug}.png`);

      if (!process.env.CI) {
        writeFileSync(artifact, png);
        return;
      }

      if (!existsSync(artifact)) {
        throw new Error(
          `missing PNG artifact ${slug}.png; run vitest locally to write it`
        );
      }
      expect(png.equals(readFileSync(artifact))).toBe(true);
    });
  }
});
