/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Script } from 'node:vm';

import { describe, expect, it } from 'vitest';

import { embedJs } from './embed_script';

const run = (code: string): unknown => {
  const context: { out?: unknown } = {};
  new Script(code).runInNewContext({ globalThis: context });
  return context.out;
};

describe('embedJs', () => {
  it('escapes `</script` in a tagged template and keeps its strings', () => {
    const source =
      'const tag = (parts) => [parts[0], parts.raw[0]]; globalThis.out = tag`a</script>b`;';
    const embedded = embedJs(source);
    expect(embedded).not.toMatch(/<\/script/i);
    expect(run(embedded)).toEqual(['a</script>b', 'a</script>b']);
  });

  it('escapes `</script` in a string literal and keeps its value', () => {
    const source = "globalThis.out = '</SCRIPT><img src=x>';";
    const embedded = embedJs(source);
    expect(embedded).not.toMatch(/<\/script/i);
    expect(run(embedded)).toBe('</SCRIPT><img src=x>');
  });

  it('returns ordinary script text unchanged', () => {
    const source = "if (a < b) x.replace(/</g, '&lt;'); y = '</div>';";
    expect(embedJs(source)).toBe(source);
  });
});
