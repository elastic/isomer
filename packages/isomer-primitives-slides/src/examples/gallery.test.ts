/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { beforeAll, describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../pack';
import { slideDeckPrimitives } from '../registry';

import { slideFonts } from './fonts';
import { buildGallery } from './gallery';
import { previewSlide } from './preview_slide';

const docsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../docs');
const galleryDir = join(docsDir, 'gallery');
// Gitignored: the docs build writes these by running this file.
const imagesDir = join(galleryDir, 'images');

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});
const takumi = createTakumiImageBackend({ fonts: slideFonts });

const gallery = buildGallery(slideDeckPrimitives, {
  markdown: (node) => runtime.surfaces.markdown.renderNode(node),
  text: (node) => runtime.surfaces.text.renderNode(node),
  slack: (node) => runtime.surfaces.slack.renderNode(node),
});

const filesUnder = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) =>
          join(entry.parentPath, entry.name).slice(galleryDir.length + 1)
        )
    : [];

describe('gallery', () => {
  beforeAll(() => {
    rmSync(imagesDir, { force: true, recursive: true });
    mkdirSync(imagesDir, { recursive: true });
  });

  it.each(gallery.pages)('$path', async ({ path, contents }) => {
    await expect(contents).toMatchFileSnapshot(join(galleryDir, path));
  });

  it.each(gallery.images)('$path', async ({ path, node, scheme }) => {
    const png = await takumi.png(
      runtime.surfaces.svg.render(previewSlide(node), { theme: scheme })
    );
    expect(png.subarray(0, PNG_SIGNATURE.length)).toEqual(PNG_SIGNATURE);
    writeFileSync(join(galleryDir, path), png);
  });

  // Locally an orphan is removed, the way an artifact is rewritten; under `CI` it fails.
  it('holds nothing it did not generate', () => {
    const expected = new Set(gallery.pages.map(({ path }) => path));
    const orphans = filesUnder(galleryDir).filter(
      (path) => !path.startsWith('images/') && !expected.has(path)
    );
    if (!process.env.CI) {
      for (const orphan of orphans) {
        rmSync(join(galleryDir, orphan));
      }
      return;
    }
    expect(orphans).toEqual([]);
  });

  it('is listed in the docs toc', () => {
    const children = gallery.pages
      .map(({ path }) => `      - file: ${path}`)
      .join('\n');
    expect(readFileSync(join(docsDir, 'toc.yml'), 'utf8')).toContain(
      `  - folder: gallery\n    children:\n${children}\n`
    );
  });
});
