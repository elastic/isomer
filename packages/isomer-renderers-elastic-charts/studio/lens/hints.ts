/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensPlan } from '@elastic/isomer-lowering-lens';

type Visualization = Record<string, unknown>;

/** The accessors each chart reads as a maximum, which synthetic data draws above the rest. */
const MAX_ACCESSORS: Record<string, (state: Visualization) => unknown[]> = {
  lnsMetric: ({ maxAccessor }) => [maxAccessor],
};

/**
 * The synthetic columns that read as a maximum: ES|QL columns are keyed by
 * field name, form-based ones by column ID.
 */
export const maxColumns = (plan: LensPlan): ReadonlySet<string> => {
  const { visualizationType, state } = plan.source.attributes;
  const accessors = new Set(
    (Object.hasOwn(MAX_ACCESSORS, visualizationType)
      ? MAX_ACCESSORS[visualizationType]!(state.visualization as Visualization)
      : []
    ).filter((accessor): accessor is string => typeof accessor === 'string')
  );
  return new Set(
    plan.layers.flatMap((layer) =>
      layer.kind === 'esql'
        ? layer.columns
            .filter(({ columnId }) => accessors.has(columnId))
            .map(({ fieldName }) => fieldName)
        : [...accessors]
    )
  );
};
