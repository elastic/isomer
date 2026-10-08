/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { build } from 'esbuild';

import type { StudioConfig, StudioTheme } from '../config';
import { composeExample } from '../model/compose_example';
import { compositionKey } from '../model/composition_key';
import type { PngManifest } from '../model/png_manifest';
import { readExamples } from '../model/read_examples';

import { APP_DIR, appBuildOptions, renderIndexHtml } from './app_bundle';
import type { ConfigLoader } from './load_config';
import { loadStudioConfig } from './load_config';
import type { NodeRasterizer } from './rasterize';
import { createRasterizer } from './rasterize';

const THEMES: readonly StudioTheme[] = ['light', 'dark'];

export interface PrerenderResult {
  manifest: PngManifest;
  /** Examples that could not be rasterized, as `primitive › example (theme): message`. */
  failures: string[];
}

/** Rasterizes every example in both themes into `dir`, keyed by `compositionKey`, plus `manifest.json`. */
export const prerenderPngs = async (
  { runtime, compose }: StudioConfig,
  rasterize: NodeRasterizer,
  dir: string
): Promise<PrerenderResult> => {
  mkdirSync(dir, { recursive: true });
  const manifest: PngManifest = { version: 1, entries: {} };
  const failures: string[] = [];

  for (const definition of runtime.primitives) {
    for (const { name: example, node } of readExamples(definition)) {
      for (const theme of THEMES) {
        try {
          const composition = composeExample(compose, [node], theme);
          const key = compositionKey(composition);
          if (manifest.entries[key]) {
            continue;
          }
          const file = `${key}.png`;
          writeFileSync(join(dir, file), await rasterize(composition));
          manifest.entries[key] = {
            file,
            primitive: definition.type,
            example,
            theme,
          };
        } catch (error) {
          failures.push(
            `${definition.type} › ${example} (${theme}): ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }
  }

  writeFileSync(
    join(dir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  return { manifest, failures };
};

/** Written into every build, so a later build only clears a directory a Studio build made. */
export const BUILD_MARKER = '.isomer-studio-build';

/** Clears `out` for a new build, refusing a non-empty directory that is not a previous build. */
export const prepareOut = (out: string): void => {
  if (
    existsSync(out) &&
    readdirSync(out).length > 0 &&
    !existsSync(join(out, BUILD_MARKER))
  ) {
    throw new Error(
      `${out} is not empty and holds no Studio build; pick another --out.`
    );
  }
  rmSync(out, { force: true, recursive: true });
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, BUILD_MARKER), '');
};

export interface BuildSiteOptions {
  configPath: string;
  out: string;
  base: string;
  loader?: ConfigLoader | undefined;
}

export interface BuildSiteResult {
  pngs: number;
  failures: string[];
}

/** Writes the static Studio for `configPath` to `out`: the prebuilt assets, `app.js`, and the PNG manifest. */
export const buildSite = async ({
  configPath,
  out,
  base,
  loader,
}: BuildSiteOptions): Promise<BuildSiteResult> => {
  const config = await loadStudioConfig(configPath, { loader });
  prepareOut(out);
  cpSync(APP_DIR, out, { recursive: true });
  writeFileSync(
    join(out, 'index.html'),
    renderIndexHtml({ base, title: config.title })
  );
  await build(
    appBuildOptions({
      configPath,
      mode: 'build',
      assetsDir: join(out, 'assets'),
    })
  );

  const rasterize = createRasterizer(config.runtime);
  if (!rasterize) {
    return { pngs: 0, failures: [] };
  }
  const { manifest, failures } = await prerenderPngs(
    config,
    rasterize,
    join(out, 'png')
  );
  return { pngs: Object.keys(manifest.entries).length, failures };
};
