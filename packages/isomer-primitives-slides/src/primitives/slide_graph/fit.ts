/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideRenderContext } from '../../render/context';
import { stripMarks } from '../../render/marks';
import { displayColumns } from '../../render/mono';
import { graph, graphFit } from '../../theme/components/graph';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import { slideLayout } from '../layout';
import { sizeForWidthLoad } from '../size';

import { graphLayout } from './layout';
import type { SlideGraphNode } from './schema';

export const graphLoad = (node: SlideGraphNode): number => {
  const { main, above, below } = graphLayout(node);
  const rows = [main, above, below].filter((row) => row !== undefined).length;
  const longest = Math.max(
    ...node.nodes.map(
      ({ term, body }) =>
        displayColumns(term) + displayColumns(stripMarks(body))
    )
  );
  return (
    rows * longest +
    (node.caption ? displayColumns(stripMarks(node.caption)) : 0)
  );
};

export const graphStep = (
  node: SlideGraphNode,
  context: SlideRenderContext | undefined
): SlideSize =>
  sizeForWidthLoad(
    node.size,
    graphLoad(node),
    graphFit,
    slideLayout(context),
    scalePx(graph.track) * (graphLayout(node).main.length - 1)
  );
