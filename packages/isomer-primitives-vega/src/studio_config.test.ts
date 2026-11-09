/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import config from '../isomer-studio.config';

import { VEGA_THEMES } from './render/theme';
import { vegaExample, vegaGrammarExample } from './schema/examples';

const { runtime } = config;

describe('the vega Studio config', () => {
  it.each(['light', 'dark'] as const)(
    'draws two examples on the %s snapshot page in that scheme',
    (theme) => {
      const composition = {
        type: 'view' as const,
        theme,
        body: [vegaExample, vegaGrammarExample],
      };
      expect(runtime.validate(composition).errors).toEqual([]);
      const snapshot = runtime.surfaces.snapshot?.render(composition);
      expect(snapshot?.html).toContain(`fill="${VEGA_THEMES[theme].label}"`);
      expect(snapshot?.html).toContain(VEGA_THEMES[theme].background);
      expect(snapshot?.height).toBeGreaterThan(
        (vegaExample.height ?? 0) + (vegaGrammarExample.height ?? 0)
      );
    }
  );
});
