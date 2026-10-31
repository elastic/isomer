/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { rolldown } from 'rolldown';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { slideStylesheet } from './stylesheet';
import { slideDistillery } from './theme/distillery';
import { deckRootModule } from './theme/modules';

const srcDir = fileURLToPath(new URL('./', import.meta.url));
const packageDir = join(srcDir, '..');
const require = createRequire(join(packageDir, 'package.json'));

const styleFiles = [
  join(srcDir, 'theme', 'modules.ts'),
  ...readdirSync(join(srcDir, 'primitives'))
    .map((name) => join(srcDir, 'primitives', name, 'styles.ts'))
    .filter((file) => existsSync(file)),
];

describe('slideStylesheet', () => {
  it('imports every registration file directly, exactly once', () => {
    const imports = [
      ...readFileSync(join(srcDir, 'stylesheet.ts'), 'utf8').matchAll(
        /^import '(.+)';$/gm
      ),
    ].map(([, path]) => join(srcDir, `${path}.ts`));
    expect(imports.sort()).toEqual([...styleFiles].sort());
  });

  it('preserves the complete CSS from the value-based collector', () => {
    const css = slideStylesheet();
    expect(css).toHaveLength(63239);
    expect(createHash('sha256').update(css).digest('hex')).toBe(
      '7cfa80712e98313aa8ea252ef645631a16f7027edee7e973db265ab232d29a47'
    );
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

describe('packed slideStylesheet', () => {
  let fixtureDir: string;

  beforeAll(() => {
    fixtureDir = realpathSync(
      mkdtempSync(join(tmpdir(), 'isomer-slides-stylesheet-'))
    );
    execFileSync('pnpm', ['pack', '--out', join(fixtureDir, 'slides.tgz')], {
      cwd: packageDir,
      stdio: 'pipe',
    });
    execFileSync('tar', [
      '-xzf',
      join(fixtureDir, 'slides.tgz'),
      '-C',
      fixtureDir,
    ]);
  });

  afterAll(() => {
    if (fixtureDir) {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  const bundleStylesheet = async (format: string) => {
    const consumer = join(fixtureDir, `consumer-${format}.js`);
    writeFileSync(
      consumer,
      `export { slideStylesheet } from './package/lib/${format}/index.js';`
    );
    const bundle = await rolldown({
      input: consumer,
      plugins: [
        {
          name: 'external-package-dependencies',
          resolveId(id) {
            if (!id.startsWith('.') && !isAbsolute(id)) {
              return { id: require.resolve(id), external: true };
            }
          },
        },
      ],
    });
    try {
      const {
        output: [{ code, modules }],
      } = await bundle.generate({ format: 'cjs' });
      const libDir = join(fixtureDir, 'package', 'lib', format);
      const missing = styleFiles
        .map((file) => relative(srcDir, file).replace(/\.ts$/, '.js'))
        .filter((file) => !modules[join(libDir, file)]?.renderedLength);

      const output = join(fixtureDir, `bundle-${format}.cjs`);
      writeFileSync(output, code);
      const css = execFileSync(
        process.execPath,
        [
          '-e',
          `process.stdout.write(require(${JSON.stringify(output)}).slideStylesheet())`,
        ],
        { encoding: 'utf8' }
      );
      return { missing, css };
    } finally {
      await bundle.close();
    }
  };

  // Exercise the manifest and emitted files a consumer receives, not source aliases.
  it.each(['esm', 'cjs'])(
    'retains every registration and identical CSS through the packed %s public entry',
    async (format) => {
      const { missing, css } = await bundleStylesheet(format);
      expect(missing).toEqual([]);
      expect(css).toBe(slideStylesheet());
    }
  );

  it('reproduces lost registrations when the packed metadata declares no side effects', async () => {
    const manifestPath = join(fixtureDir, 'package', 'package.json');
    const original = readFileSync(manifestPath, 'utf8');
    const manifest: unknown = JSON.parse(original);
    if (typeof manifest !== 'object' || manifest === null) {
      throw new Error('The packed package manifest must be an object');
    }
    writeFileSync(
      manifestPath,
      JSON.stringify({ ...manifest, sideEffects: false })
    );
    try {
      const { missing, css } = await bundleStylesheet('esm');
      expect(missing).toHaveLength(styleFiles.length);
      expect(css).not.toBe(slideStylesheet());
    } finally {
      writeFileSync(manifestPath, original);
    }
  });
});
