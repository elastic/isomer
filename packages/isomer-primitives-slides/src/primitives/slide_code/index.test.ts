/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { markdown } from './index';

describe('slideCode markdown fence', () => {
  it('falls back to text for a hostile language token', () => {
    const md = markdown({
      type: 'slideCode',
      code: 'x',
      language: 'ts\n```\nmalicious',
    });
    expect(md).toContain('```text');
  });

  it('lengthens the fence past a backtick run in the body', () => {
    const md = markdown({
      type: 'slideCode',
      code: 'a ```js\nconsole.log(1)\n``` b',
      language: 'md',
    });
    expect(md).toMatch(/^````md\n/);
    expect(md.trim().endsWith('````')).toBe(true);
  });
});
