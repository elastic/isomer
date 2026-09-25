/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it, vi } from 'vitest';

import { runEnhancementScript } from './enhancements';

const section = (embedded = false) => ({
  ran: false,
  querySelector: (selector: string) =>
    embedded && selector === 'script[data-isomer-script]' ? {} : null,
});

describe('runEnhancementScript', () => {
  it('runs the body with root bound to the given section', () => {
    const root = section();
    runEnhancementScript('root.ran = true;', root as unknown as Element);
    expect(root.ran).toBe(true);
  });

  it('throws a coded IsomerError when the host passes no root', () => {
    expect(() =>
      runEnhancementScript('', null as unknown as Element)
    ).toThrowError(
      expect.objectContaining({
        name: 'IsomerError',
        code: 'ENHANCEMENT_ROOT_MISSING',
      })
    );
  });

  it('warns when the HTML also carries an embedded script', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      runEnhancementScript('', section(true) as unknown as Element);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("scripts: 'embedded'")
      );
      warn.mockClear();
      runEnhancementScript('', section() as unknown as Element);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
