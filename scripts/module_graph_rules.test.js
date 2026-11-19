/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { forbiddenReachable, RULES } from './module_graph_rules.js';

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

describe.each(['./schema', './scene', './resolve', '.'])(
  'charts %s loaders',
  (entryKey) => {
    const forbidden = RULES['@elastic/isomer-primitives-charts'][entryKey];
    const entryWith = (code) => {
      entries += 1;
      const entry = join(fixtures, `loader_${entries}.js`);
      writeFileSync(entry, code);
      return entry;
    };

    it.each([
      'export const a = (name) => import(name);',
      'export const a = (name) => import(`@elastic/isomer-primitives-charts/${name}`);',
      'export const a = (name) => import(`${name}`);',
      'export const a = (name) => module.require(name);',
      "export const a = (name) => module['require'](name);",
      "export const a = (name) => Reflect.get(module, 'require').call(module, name);",
      'const r = require;\nexport const a = (name) => r(name);',
      "import { createRequire } from 'node:module';\nexport const r = createRequire(import.meta.url);",
      "import * as nm from 'node:module';\nexport const r = nm['createRequire'](import.meta.url);",
    ])('rejects a loader the graph cannot follow: %s', async (code) => {
      expect(
        (await forbiddenReachable(entryWith(code), forbidden)).length
      ).toBeGreaterThan(0);
    });

    it('allows the word require in strings, templates and comments', async () => {
      expect(
        await forbiddenReachable(
          entryWith(
            "// require\nexport const a = 'Some charts require data.';\nexport const b = `charts require ${a}`;"
          ),
          forbidden
        )
      ).toEqual([]);
    });

    it('allows literal dynamic imports of allowed packages and plain calls', async () => {
      expect(
        await forbiddenReachable(
          entryWith(
            "export const a = () => import('zod');\nexport const s = Symbol.for('@elastic/isomer-primitives-charts/style-scope');"
          ),
          forbidden
        )
      ).toEqual([]);
    });
  }
);

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
