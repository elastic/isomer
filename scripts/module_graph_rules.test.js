/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  bundledPackagesOf,
  forbiddenReachable,
  requiresBundled,
  RULES,
} from './module_graph_rules.js';
import { repoRoot } from './workspace_packages.js';

const fixtures = mkdtempSync(join(tmpdir(), 'module-graph-rules-'));
afterAll(() => rmSync(fixtures, { recursive: true, force: true }));

let entries = 0;
const entryImporting = (...specifiers) => {
  entries += 1;
  const entry = join(fixtures, `entry_${entries}.js`);
  writeFileSync(
    entry,
    specifiers
      .map((specifier, index) => `export * as m${index} from '${specifier}';`)
      .join('\n')
  );
  return entry;
};

// A relative module the entry reaches, which imports the specifier itself.
const entryReaching = (specifier) => {
  entries += 1;
  writeFileSync(
    join(fixtures, `helper_${entries}.js`),
    `export * as reached from '${specifier}';`
  );
  return entryImporting(`./helper_${entries}.js`);
};

describe.each(['./schema', './scene', './resolve'])('charts %s', (entryKey) => {
  const forbidden = RULES['@elastic/isomer-primitives-charts'][entryKey];

  it('allows zod, d3-scale and the SDK schema entry', async () => {
    expect(
      await forbiddenReachable(
        entryImporting('zod', 'd3-scale', '@elastic/isomer-sdk/schema'),
        forbidden
      )
    ).toEqual([]);
  });

  it.each([
    '@elastic/isomer-sdk',
    '@elastic/isomer-sdk/markdown',
    '@elastic/isomer-sdk/slack',
    '@elastic/isomer-sdk/text',
    '@elastic/isomer-sdk/react',
    '@elastic/isomer-sdk/schema/extra',
    'react',
    'react-dom/client',
    '@elastic/charts',
    '@elastic/isomer-runtime',
    'mdast-util-from-markdown',
    'mdast-util-gfm',
    'mdast-util-to-markdown',
    'micromark-extension-gfm',
    '@elastic/isomer-primitives-charts',
    '@elastic/isomer-primitives-charts/scene',
  ])('rejects %s, directly or through a relative module', async (specifier) => {
    expect(
      await forbiddenReachable(entryImporting(specifier), forbidden)
    ).toEqual([specifier]);
    expect(
      await forbiddenReachable(entryReaching(specifier), forbidden)
    ).toEqual([specifier]);
  });
});

describe.each(['./schema', './resolve'])('charts %s', (entryKey) => {
  const forbidden = RULES['@elastic/isomer-primitives-charts'][entryKey];

  it('rejects Distillate, directly or through a relative module', async () => {
    expect(
      await forbiddenReachable(entryImporting('@elastic/distillate'), forbidden)
    ).toEqual(['@elastic/distillate']);
    expect(
      await forbiddenReachable(entryReaching('@elastic/distillate'), forbidden)
    ).toEqual(['@elastic/distillate']);
  });
});

describe('charts ./scene', () => {
  it('allows Distillate, for the style helpers it exports', async () => {
    expect(
      await forbiddenReachable(
        entryImporting('@elastic/distillate'),
        RULES['@elastic/isomer-primitives-charts']['./scene']
      )
    ).toEqual([]);
  });
});

describe('charts .', () => {
  const forbidden = RULES['@elastic/isomer-primitives-charts']['.'];

  it('allows React and the SDK', async () => {
    expect(
      await forbiddenReachable(
        entryImporting('react', '@elastic/isomer-sdk'),
        forbidden
      )
    ).toEqual([]);
  });

  it.each([
    '@elastic/isomer-runtime',
    'react-dom',
    'react-dom/client',
    'react-dom/server',
  ])(
    'rejects %s, the testing entry’s peer, directly or through a relative module',
    async (specifier) => {
      expect(
        await forbiddenReachable(entryImporting(specifier), forbidden)
      ).toEqual([specifier]);
      expect(
        await forbiddenReachable(entryReaching(specifier), forbidden)
      ).toEqual([specifier]);
    }
  );

  it('rejects a lazy load of its own testing entry', async () => {
    entries += 1;
    const entry = join(fixtures, `lazy_${entries}.js`);
    writeFileSync(
      entry,
      "export const load = () => import('@elastic/isomer-primitives-charts/testing');"
    );
    expect(await forbiddenReachable(entry, forbidden)).toEqual([
      '@elastic/isomer-primitives-charts/testing',
    ]);
  });
});

describe('SDK ./schema', () => {
  const forbidden = RULES['@elastic/isomer-sdk']['./schema'];

  it('allows zod', async () => {
    expect(await forbiddenReachable(entryImporting('zod'), forbidden)).toEqual(
      []
    );
  });

  it.each(['react', 'react-dom/server', 'mdast-util-gfm'])(
    'rejects %s through a relative module',
    async (specifier) => {
      expect(
        await forbiddenReachable(entryReaching(specifier), forbidden)
      ).toEqual([specifier]);
    }
  );
});

describe('SDK CommonJS Markdown bundle', () => {
  const bundled = new Set(['mdast-util-gfm', 'micromark-util-encode']);

  // A CommonJS entry that requires `nested/helper.js`, whose source is `body`, beside a `parsers.js` with the parser inlined.
  const cjsEntryRequiring = (body) => {
    entries += 1;
    mkdirSync(join(fixtures, `cjs_${entries}`, 'nested'), { recursive: true });
    writeFileSync(
      join(fixtures, `cjs_${entries}`, 'parsers.js'),
      'module.exports = { toMarkdown: () => "" };'
    );
    writeFileSync(
      join(fixtures, `cjs_${entries}`, 'nested', 'helper.js'),
      body
    );
    const entry = join(fixtures, `cjs_${entries}`, 'index.js');
    writeFileSync(entry, "module.exports = require('./nested/helper.js');");
    return entry;
  };

  const specifiersOf = async (entry) =>
    (await requiresBundled([entry], bundled)).map(({ specifier }) => specifier);

  it('finds every package the parser module inlines, transitive ones too', async () => {
    const found = await bundledPackagesOf(
      join(repoRoot, 'packages/isomer-sdk/src/render/markdown/parsers.ts')
    );
    expect([...found]).toEqual(
      expect.arrayContaining([
        'mdast-util-from-markdown',
        'mdast-util-gfm',
        'mdast-util-to-markdown',
        'micromark-extension-gfm',
        'micromark-util-encode',
      ])
    );
  });

  it('allows a module that takes the parser from a local wrapper', async () => {
    expect(
      await specifiersOf(
        cjsEntryRequiring("module.exports = require('../parsers.js');")
      )
    ).toEqual([]);
  });

  it('ignores a file no entry reaches, even one that requires a bundled package', async () => {
    const entry = cjsEntryRequiring(
      "module.exports = require('../parsers.js');"
    );
    writeFileSync(
      join(dirname(entry), 'unreached.js'),
      "require('mdast-util-gfm');"
    );
    expect(await specifiersOf(entry)).toEqual([]);
  });

  it.each([
    ['a nested transitive require', "require('micromark-util-encode');"],
    ['a double-quoted require', 'require("mdast-util-gfm");'],
    [
      'a require after a string holding //',
      'const sep = "a//b"; require("mdast-util-gfm");',
    ],
  ])('rejects %s', async (_, body) => {
    expect(await specifiersOf(cjsEntryRequiring(body))).toHaveLength(1);
  });
});
