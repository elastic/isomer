/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { slideModules, slideStylesheet } from '../stylesheet';

import { themeVarName } from './distillery';
import { slideTones } from './variants';

const ruleFor = (css: string, readableName: string): string => {
  const start = css.indexOf(`.${readableName}{`);
  const end = start === -1 ? -1 : css.indexOf('}', start);
  return start === -1 ? '' : css.slice(start, end + 1);
};

describe('slide theme', () => {
  it('no two tones render the same color', () => {
    const css = slideStylesheet();
    const rules = slideTones.map((tone) =>
      ruleFor(css, slideModules.tones.handles.tone[tone].readableName)
    );
    expect(new Set(rules).size).toBe(rules.length);
    expect(rules.every(Boolean)).toBe(true);
  });

  it('sets nothing below 24px', () => {
    const sizes = [
      ...slideStylesheet().matchAll(/font-size:\s*([\d.]+)px/g),
    ].map(([, px]) => Number(px));
    expect(sizes.length).toBeGreaterThan(0);
    expect(sizes.filter((px) => px < 24)).toEqual([]);
  });

  it('an inverse frame redeclares the page palette', () => {
    const inverse = slideModules.frame.handles.tone.inverse;
    expect(inverse).toBeDefined();
    const rule = ruleFor(slideStylesheet(), inverse!.readableName);
    for (const path of [
      'color/bgPage',
      'color/text',
      'color/primary',
      'color/line',
    ]) {
      expect(rule, path).toContain(`${themeVarName(path)}:`);
    }
  });

  it('rule() selectors resolve to real class names', () => {
    expect(slideStylesheet()).not.toContain('undefined');
  });
});
