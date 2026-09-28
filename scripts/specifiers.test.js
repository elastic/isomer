/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { hasComputedImport, specifiersIn } from './specifiers.js';

describe('hasComputedImport', () => {
  it.each([
    ['a variable', 'const m = await import(name);'],
    ['a template literal', 'await import(`./locale/${lang}.js`);'],
    ['a call', "await import(pathFor('x'));"],
    ['a template interpolation', 'const x = `${await import(name)}`;'],
    [
      'a regex holding a quote before it',
      'const r = /[\'"]/; await import(name);',
    ],
  ])('finds an import() of %s', (_name, source) => {
    expect(hasComputedImport(source)).toBe(true);
  });

  it.each([
    ['a string literal', "await import('./a.js');"],
    ['a string that mentions one', 'const text = "import(foo)";'],
    ['a template string that mentions one', 'const text = `see import(foo)`;'],
    ['a comment', '// import(foo)\n/* import(bar) */'],
    ['import.meta', 'const url = import.meta.url;'],
    ['a method named import', 'loader.import(name);'],
    [
      'a private method named import',
      'class A { #import(n) {} run() { this.#import(name); } }',
    ],
    [
      'an identifier ending in import',
      'const ñimport = (n) => n; ñimport(name);',
    ],
  ])('ignores %s', (_name, source) => {
    expect(hasComputedImport(source)).toBe(false);
  });
});

describe('specifiersIn', () => {
  it('reads specifiers after a regex that holds a quote, and in declaration types', () => {
    expect(
      specifiersIn(
        "const r = /['\"]/;\nexport { a } from './a.js';\nexport type B = import('./b.js').B;\nconst c = require('c');"
      )
    ).toEqual(['./a.js', './b.js', 'c']);
  });

  it('reads static and dynamic specifiers but not ones inside strings', () => {
    expect(
      specifiersIn(
        "import a from './a.js';\nconst b = await import('b');\nconst c = \"import('c')\";"
      )
    ).toEqual(['./a.js', 'b']);
  });
});
