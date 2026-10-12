/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { rawText, sourceLines } from './source_text';

describe('rawText', () => {
  it('keeps leading indentation and joins text pieces', () => {
    expect(rawText(['  return ', 1, ';'])).toBe('  return 1;');
    expect(rawText(undefined)).toBe('');
  });

  it('refuses an element', () => {
    expect(() => rawText(createElement('span'))).toThrow(
      expect.objectContaining({ code: 'EXPECTED_TEXT_CHILDREN' })
    );
  });
});

describe('sourceLines', () => {
  it('drops the template literal frame and the shared indentation', () => {
    expect(sourceLines('\n    if (a) {\n      b();\n\n    }\n  ')).toEqual([
      'if (a) {',
      '  b();',
      '',
      '}',
    ]);
  });

  it('keeps a one-line source as written', () => {
    expect(sourceLines('curl')).toEqual(['curl']);
  });

  it('reads Windows line breaks as line breaks', () => {
    expect(sourceLines('a\r\nb')).toEqual(['a', 'b']);
  });
});
