/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readdirSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { rolldown } from 'rolldown';
import { describe, expect, it } from 'vitest';

import { slideDeckPrimitives } from './registry';
import { slideStyleModules, slideStylesheet } from './stylesheet';
import { slideDistillery } from './theme/distillery';
import { deckRootModule } from './theme/modules';

const srcDir = fileURLToPath(new URL('./', import.meta.url));
const packageDir = join(srcDir, '..');

const styleFiles = [
  join(srcDir, 'theme', 'modules.ts'),
  ...readdirSync(join(srcDir, 'primitives'))
    .map((name) => join(srcDir, 'primitives', name, 'styles.ts'))
    .filter((file) => existsSync(file)),
];

describe('slideStylesheet', () => {
  it('lists every module the registry creates', () => {
    expect(slideDeckPrimitives.length).toBeGreaterThan(0);
    const listed = slideDistillery.artifactCollector('readable');
    slideStyleModules.forEach((module) => listed.useAllEntries(module));
    expect(slideDistillery.renderStyles(listed)).toBe(slideStylesheet());
  });

  it('still prunes CSS for an artifact', () => {
    const collector = slideDistillery.artifactCollector('readable');
    collector.use(deckRootModule.handles.root);
    const css = slideDistillery.renderStyles(collector);
    expect(css).toContain('.deckRoot-root');
    expect(slideStylesheet()).toContain('.stat-root');
    expect(css).not.toContain('.stat-root');
    expect(css.length).toBeLessThan(slideStylesheet().length);
  });

  it('keeps every style module in a rolldown bundle of the stylesheet alone', async () => {
    const bundle = await rolldown({
      input: join(srcDir, 'stylesheet.ts'),
      cwd: packageDir,
      external: (id) => !id.startsWith('.') && !isAbsolute(id),
    });
    try {
      const {
        output: [{ modules }],
      } = await bundle.generate({ format: 'esm' });

      expect(
        styleFiles
          .filter((file) => !modules[file]?.renderedLength)
          .map((file) => relative(srcDir, file))
      ).toEqual([]);
    } finally {
      await bundle.close();
    }
  });
});
