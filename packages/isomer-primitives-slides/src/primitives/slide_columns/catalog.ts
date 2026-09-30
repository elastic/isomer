/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideColumnsNode}. */
export const catalog = {
  type: 'slideColumns',
  purpose:
    'Lay two to four parallel options side by side so the audience can weigh them against each other.',
  useWhen: [
    'You compare approaches, tiers, or strategies, each with a name, a few tags, and a sentence.',
    'Each option owns a set of short identifiers worth showing as chips.',
    'One qualifying remark applies to every option; put it in `footnote`.',
    'One option is the recommendation: set `highlight` to its column.',
  ],
  avoidWhen: [
    'The columns are numbers to compare; use slideStats.',
    'There are exactly two sides, one per owner, each holding slide nodes; use slideSplit.',
    'The columns name who owns what; use slideTerritoryGroup.',
    'The items are terms the audience must learn; use slideDefinitions.',
    'The items are short facts in a single list; use slideList.',
    'Every option shares the same attributes to compare cell by cell; use slideTable.',
    'Three or four options would sit in a slideSplit pane, too narrow for a column each; give them the slide’s full width.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
