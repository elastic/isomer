/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripMarks } from '../../render/marks';
import {
  definitionsFit,
  definitionsRowFit,
  definitionsSingleColumnMax,
} from '../../theme/components/definitions';
import type { SlideSize } from '../../theme/variants';
import type { StepLayout } from '../layout';
import { rowLoad, sizeForLoad, sizeForWidthLoad, smallerStep } from '../size';

import type { SlideDefinition, SlideDefinitionsNode } from './schema';

/** Top-to-bottom, then left-to-right, so the glossary reads in order. */
export const definitionColumns = (
  items: readonly SlideDefinition[]
): (readonly SlideDefinition[])[] => {
  if (items.length <= definitionsSingleColumnMax) {
    return [items];
  }
  const half = Math.ceil(items.length / 2);
  return [items.slice(0, half), items.slice(half)];
};

/** The node's own `size`, else the smaller of the steps its text and its rows per column take. */
export const definitionsStep = (
  { items, size }: Pick<SlideDefinitionsNode, 'items' | 'size'>,
  layout: Pick<StepLayout, 'width' | 'crowding'>
): SlideSize => {
  const columns = definitionColumns(items);
  return smallerStep(
    sizeForWidthLoad(
      size,
      rowLoad(
        columns.map((column) =>
          column.flatMap(({ term, body }) => [term, stripMarks(body)])
        )
      ),
      definitionsFit,
      layout
    ),
    sizeForLoad(
      size,
      Math.max(...columns.map(({ length }) => length)),
      definitionsRowFit,
      layout.crowding
    )
  );
};
