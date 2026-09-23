/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { deck } from './deck';
import { runtime } from './runtime';
import { slideCount } from './slide_count';
import { firstAttempt, secondAttempt } from './slides/06_agent';
import { themes } from './surfaces';

describe('deck', () => {
  it('includes every slide file', () => {
    expect(deck).toHaveLength(slideCount);
  });

  it('gives every slide a unique slug', () => {
    const slugs = deck.map(({ slug }) => slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(deck.map((slide, index) => ({ ...slide, index })))(
    '$slug renders on every surface',
    ({ composition, index }) => {
      expect(runtime.validate(composition).errors).toEqual([]);

      const [frame] = composition.body;
      expect(frame).toMatchObject({
        type: 'slideFrame',
        chapterNumber: String(index).padStart(2, '0'),
      });

      expect(
        runtime.surfaces.html.render(composition).validationErrors
      ).toEqual([]);
      expect(runtime.surfaces.markdown.render(composition)).not.toBe('');
      expect(runtime.surfaces.text.render(composition)).not.toBe('');
      expect(runtime.surfaces.slack.render(composition).blocks).not.toEqual([]);
      for (const theme of themes) {
        expect(
          runtime.surfaces.svg.render(composition, { theme }).width
        ).toBeGreaterThan(0);
      }
    }
  );

  it('replays a real parse failure and a real recovery on the agent slide', () => {
    expect(runtime.parse(firstAttempt).valid).toBe(false);
    expect(runtime.parse(secondAttempt).valid).toBe(true);
  });
});
