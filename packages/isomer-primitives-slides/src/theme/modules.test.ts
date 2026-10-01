/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { slideModules, slideStylesheet } from '../stylesheet';

import { color } from './base';
import { themeVarName } from './distillery';
import { SLIDE_THEME } from './theme';
import { slideTones } from './variants';

const ruleFor = (css: string, readableName: string): string => {
  const start = css.indexOf(`.${readableName}{`);
  const end = start === -1 ? -1 : css.indexOf('}', start);
  return start === -1 ? '' : css.slice(start, end + 1);
};

describe('slide theme', () => {
  it('no two tones render the same color', () => {
    const css = slideStylesheet();
    // The declarations, not the rule: distinct selectors would make any two rules differ.
    const bodies = slideTones.map((tone) => {
      const rule = ruleFor(
        css,
        slideModules.tones.handles.tone[tone].readableName
      );
      return rule.slice(rule.indexOf('{'));
    });
    expect(bodies.every((body) => /--[\w-]+:\s*\S/.test(body))).toBe(true);
    expect(new Set(bodies).size).toBe(bodies.length);
  });

  it('no two tones share a cue, so color is never the only difference', () => {
    const css = slideStylesheet();
    const { glyph, label } = SLIDE_THEME.tone;
    const shapes = slideTones.map((tone) =>
      ruleFor(
        css,
        slideModules.tones.handles.cueShape[tone].readableName
      ).replace(/^[^{]*/, '')
    );
    for (const cues of [
      shapes,
      slideTones.map((tone) => glyph[tone].value),
      slideTones.map((tone) => label[tone].value),
    ]) {
      expect(cues.every(Boolean)).toBe(true);
      expect(new Set(cues).size).toBe(slideTones.length);
    }
  });

  it('marks strong in display text with more than color', () => {
    const rule = ruleFor(
      slideStylesheet(),
      slideModules.marks.handles.strongPrimary.readableName
    );
    expect(rule).toMatch(/text-decoration:\s*underline/);
  });

  it('sets nothing below 24px', () => {
    const sizes = [
      ...slideStylesheet().matchAll(/font-size:\s*([\d.]+)px/g),
    ].map(([, px]) => Number(px));
    expect(sizes.length).toBeGreaterThan(0);
    expect(sizes.filter((px) => px < 24)).toEqual([]);
  });

  // takumi ignores `flex: none` and does not evaluate a nested `calc`.
  it('writes flex and calc in forms the image surface lays out', () => {
    const css = slideStylesheet();
    expect(css.match(/flex:\s*none/g)).toBeNull();
    expect(css.match(/calc\([^()]*\(/g)).toBeNull();
  });

  // takumi measures `width` and `height` to the border; a browser does only under `box-sizing: border-box`.
  it('no rule sizes a padded or bordered box without `box-sizing: border-box`', () => {
    const sized =
      /(?:^|;)\s*(?:max-|min-)?(?:width|height)\s*:\s*(?!auto|0\s*(?:;|$))/;
    const boxed =
      /(?:^|;)\s*(?:padding|border)(?:-(?:top|right|bottom|left))?\s*:\s*(?!none|0\s*(?:;|$))/;
    const borderBox = /box-sizing\s*:\s*border-box/;
    const both = [...slideStylesheet().matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .map(([, selector = '', body = '']) => ({ selector, body }))
      .filter(({ body }) => sized.test(body) && boxed.test(body));
    const { readableName } = slideModules.sequence.handles.actor;
    expect(both.map(({ selector }) => selector)).toContain(`.${readableName}`);
    expect(
      both
        .filter(({ body }) => !borderBox.test(body))
        .map(({ selector }) => selector)
    ).toEqual([]);
  });

  it('a tone cue never shrinks in a flex row', () => {
    expect(
      ruleFor(slideStylesheet(), slideModules.tones.handles.cue.readableName)
    ).toMatch(/flex:\s*0 0 auto/);
  });

  it('an inverse frame redeclares the page palette', () => {
    const inverse = slideModules.frame.handles.tone.inverse;
    expect(inverse).toBeDefined();
    const rule = ruleFor(slideStylesheet(), inverse!.readableName);
    for (const key of Object.keys(color)) {
      expect(rule, key).toContain(`${themeVarName(`color/${key}`)}:`);
    }
  });

  it('rule() selectors resolve to real class names', () => {
    expect(slideStylesheet()).not.toContain('undefined');
  });
});
