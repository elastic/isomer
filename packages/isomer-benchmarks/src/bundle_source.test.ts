/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { bundleSourceEntry } from './bundle_source';

// esbuild reports real paths, and macOS's temporary directory is a symlink.
const root = realpathSync(mkdtempSync(join(tmpdir(), 'isomer-bench-source-')));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const write = (path: string, text: string) => {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  return file;
};

// A TypeScript pack importing its own TypeScript, a TypeScript workspace
// package, a built package, a built file of its own and a Node builtin.
write(
  'node_modules/built-dep/package.json',
  '{"name":"built-dep","main":"index.js"}'
);
const builtDep = write(
  'node_modules/built-dep/index.js',
  'module.exports = { built: "dep" };'
);
write(
  'node_modules/source-dep/package.json',
  '{"name":"source-dep","main":"index.ts"}'
);
write(
  'node_modules/source-dep/index.ts',
  "import { built } from 'built-dep';\nexport const fromSource: string = `source-dep+${built}`;"
);
write(
  'node_modules/dual-dep/package.json',
  '{"name":"dual-dep","exports":{"import":"./esm.mjs","require":"./cjs.js"}}'
);
write('node_modules/dual-dep/esm.mjs', 'export const dual = "esm";');
const dualCjs = write('node_modules/dual-dep/cjs.js', 'exports.dual = "cjs";');
const builtFile = write(
  'pack/vendor.cjs',
  'module.exports = { vendored: true };'
);
write('pack/helper.ts', 'export const helper = (n: number): number => n * 2;');
write(
  'pack/index.ts',
  [
    "import { join } from 'node:path';",
    "import { built } from 'built-dep';",
    "import { dual } from 'dual-dep';",
    "import { fromSource } from 'source-dep';",
    "import { helper } from './helper';",
    "import vendor from './vendor.cjs';",
    'export const value = { built, dual, fromSource, doubled: helper(2), vendored: vendor.vendored, joined: join("a", "b") };',
  ].join('\n')
);

describe('bundleSourceEntry', () => {
  it("inlines TypeScript and leaves built JavaScript external at the path a host's require resolves", async () => {
    const outfile = join(root, 'pack/node_modules/.cache/out.cjs');
    await bundleSourceEntry({
      entry: './index',
      resolveDir: join(root, 'pack'),
      outfile,
    });
    const text = readFileSync(outfile, 'utf8');
    expect(text).toContain('n * 2');
    expect(text).toContain('source-dep+');
    expect(text).toContain(JSON.stringify(builtDep));
    expect(text).toContain(JSON.stringify(builtFile));
    expect(text).toContain(JSON.stringify(dualCjs));
    expect(text).toContain('"node:path"');
    expect(text).not.toContain('{ built: "dep" }');

    const loaded: unknown = createRequire(outfile)(outfile);
    expect(loaded).toEqual({
      value: {
        built: 'dep',
        dual: 'cjs',
        fromSource: 'source-dep+dep',
        doubled: 4,
        vendored: true,
        joined: join('a', 'b'),
      },
    });
  });

  it('fails on an entry that does not resolve', async () => {
    await expect(
      bundleSourceEntry({
        entry: 'missing-pack',
        resolveDir: join(root, 'pack'),
        outfile: join(root, 'missing.cjs'),
      })
    ).rejects.toThrow(/missing-pack/);
  });
});
