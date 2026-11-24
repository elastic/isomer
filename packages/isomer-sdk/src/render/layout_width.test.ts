/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { contextWith } from './context_view';
import { layoutWidthOf, withLayoutWidth } from './layout_width';

describe('layoutWidthOf', () => {
  it('reads the width a surface stated, and none elsewhere', () => {
    const context = { locale: 'en' };
    expect(layoutWidthOf(context)).toBeUndefined();
    expect(layoutWidthOf(undefined)).toBeUndefined();
    const laidOut = withLayoutWidth(context, 928);
    expect(layoutWidthOf(laidOut)).toBe(928);
    expect(laidOut.locale).toBe('en');
    expect(layoutWidthOf(context)).toBeUndefined();
  });

  it('survives a view a container derives for its child', () => {
    const child = contextWith(withLayoutWidth({}, 600), 'size', { width: 10 });
    expect(layoutWidthOf(child)).toBe(600);
  });
});
