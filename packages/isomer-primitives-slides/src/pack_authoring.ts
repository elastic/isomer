/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackAuthoringOptions } from '@elastic/isomer-sdk';

// `z.toJSONSchema` drops `.refine` text, so each primitive's cross-field
// constraints are restated here as its `$def` description.

/** This pack's contribution to a runtime's authoring JSON Schema. */
export const slidesPackAuthoring = {
  describe: {
    slideFrame:
      'One whole slide. Its body holds the slide content top to bottom; a slideFrame never appears inside another node.',
    slideSplit:
      'Two columns. Items are strings or slide nodes, never a slideFrame.',
    slideStack:
      'Nodes stacked vertically inside a split column or window, never a slideFrame.',
    slideTitle:
      'The title slide. Its aside is one slide node, never a slideFrame.',
    slideWindow:
      'Application chrome around slide nodes. Its body never holds a slideFrame or another slideWindow.',
    slideTable:
      'A grid of short cells. Give either rows or groups, not both; every row has exactly one cell per column.',
    slideCode:
      'One or two code panels. Every highlighted line number exists in its panel.',
    slidePipeline:
      'Steps on one rail. Without spans: numbered steps with bodies, optional start and end chips. With spans: steps are chips with no body and no start or end, and each span brackets steps from..to by index (from ≤ to < steps.length); spans do not overlap.',
    slideTimeline:
      'Three to five points on a rail. At most one item is current.',
    slideStat:
      'One headline number and the sentence that explains it. A unit needs a value; leave value out to show a placeholder.',
    slideStats:
      'Two to four comparable numbers. A unit needs a value; leave value out to show a placeholder.',
    slideGraph:
      'A fixed layout: two to four main nodes left to right, joined in order by edges, plus at most one node placed above and one below, each joined by one edge to a main node.',
    slideLanes: 'Exactly two lanes that converge on join.',
    slideSection:
      'A section divider. When hrefs is given it has one entry per contents entry.',
    slideRender:
      'An embedded render of another slide or composition. Give slide, composition, or both; an embedded composition cannot contain another render.',
    slideRenderGrid:
      'One composition rendered on several surfaces. The composition cannot contain another render.',
  },
} satisfies PackAuthoringOptions;
