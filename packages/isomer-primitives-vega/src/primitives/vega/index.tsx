/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeNavigationHref } from '@elastic/isomer-sdk';

import { isSpecObject, stripSpec } from '../../schema';
import { definePrimitive } from '../define';

import { vegaCatalog } from './catalog';
import { vegaPrimitiveSchema } from './check';
import { vegaExamples } from './examples';
import { icon } from './icon';
import { react } from './react';
import { type VegaNode } from './schema';
import { chromeHeight, vegaChartSize } from './size';
import { vegaMarkdown, vegaText } from './text';

export { type VegaRenderContext } from '../define';
export { vegaCatalog } from './catalog';
export { vegaPrimitiveSchema } from './check';
export { drawVegaNode } from './draw';
export {
  brushExample,
  donutExample,
  facetExample,
  heatmapExample,
  histogramExample,
  kibanaPanelExample,
  layeredExample,
  mapExample,
  searchResponseExample,
  signalExample,
  timeSeriesExample,
  vegaExample,
  vegaExamples,
  vegaGrammarExample,
} from './examples';
export {
  type VegaData,
  type VegaNode,
  MAX_BASEMAP_TILES,
  MAX_CHART_SIDE,
  MAX_DATA_ROWS,
  MAX_DRAWN_ITEMS,
  MAX_RESULTS,
  MAX_RESULTS_CHARS,
  MAX_SPEC_CHARS,
  MIN_CHART_SIDE,
  VEGA_RULES,
  vegaSchema,
} from './schema';
export { vegaChartSize } from './size';
export { vegaMarkdown, vegaText } from './text';

/** The `vega` primitive: a Vega or Vega-Lite spec drawn by the Vega runtime. */
export const vegaPrimitive = definePrimitive({
  type: 'vega',
  icon,
  schema: vegaPrimitiveSchema,
  catalog: vegaCatalog,
  examples: vegaExamples,
  // An unsafe link is dropped, and the spec loses everything that reaches outside it.
  sanitize: (node: VegaNode) => {
    if (!isSpecObject(node.spec)) {
      return null;
    }
    const { interactions } = node;
    const href =
      interactions?.link && sanitizeNavigationHref(interactions.link.href);
    const safeInteractions =
      interactions?.link && href === null
        ? (({ link: _link, ...rest }) => rest)(interactions)
        : interactions;
    return {
      ...node,
      spec: stripSpec(node.spec),
      ...(safeInteractions && { interactions: safeInteractions }),
    };
  },
  metrics: {
    snapshotHeight: (node: VegaNode) =>
      vegaChartSize(node, undefined).height + chromeHeight(node),
  },
  renderers: { react, text: vegaText, markdown: vegaMarkdown },
});
