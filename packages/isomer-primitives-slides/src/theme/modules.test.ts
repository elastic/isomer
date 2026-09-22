/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { slideModules, slideStylesheet } from './modules';
import { slideFrameLayouts, slideTones } from './variants';

const ruleFor = (css: string, readableName: string): string => {
  const start = css.indexOf(`.${readableName}{`);
  const end = start === -1 ? -1 : css.indexOf('}', start);
  return start === -1 ? '' : css.slice(start, end + 1);
};

describe('slide theme variants', () => {
  it('every accepted frame layout is either the baseline or has a real override', () => {
    // Every enum member is either the baseline (no class) or has a stylesheet
    // rule; a member with neither is accepted by the schema and renders nothing.
    expect(slideFrameLayouts).toEqual(['title', 'content']);
    const titleHandle = slideModules.frame.handles.layout.title;
    expect(titleHandle).toBeDefined();
    expect(slideStylesheet()).toContain(titleHandle!.readableName);
  });

  it('no two tones render the same fg/bg pair', () => {
    const css = slideStylesheet();
    const rules = slideTones.map((tone) =>
      ruleFor(css, slideModules.tones.handles.tone[tone].readableName)
    );
    expect(new Set(rules).size).toBe(rules.length);
    expect(rules.every(Boolean)).toBe(true);
  });

  it('the title-layout rule() selectors resolve to real class names', () => {
    // Guards the selector typo trap noted on `titleTopbar` in `modules.ts`.
    const css = slideStylesheet();
    expect(css).toContain('.frame-layout-title .frame-topbar');
    expect(css).toContain('.frame-layout-title .frame-body');
    expect(css).not.toContain('undefined');
  });
});
