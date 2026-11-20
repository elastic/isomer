/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@elastic/isomer-sdk';

import { createVegaView, toVegaSpec } from '../../render';
import { isSpecObject } from '../../schema';
import { VEGA_THEMES } from '../../theme';

import { type VegaNode, vegaSchema } from './schema';
import { chartInput, vegaChartSize } from './size';

/** Where the spec does not compile or parse, the message why; checked at validation so an author sees it. */
const parseProblem = (node: VegaNode): string | undefined => {
  try {
    createVegaView(
      toVegaSpec(
        chartInput(node, vegaChartSize(node, undefined)),
        VEGA_THEMES.light
      )
    ).finalize();
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

/** {@link vegaSchema} with the check that Vega compiles and parses the spec. */
export const vegaPrimitiveSchema = vegaSchema.check(
  z.superRefine<VegaNode>((node, ctx) => {
    if (!isSpecObject(node.spec)) {
      return;
    }
    const problem = parseProblem(node);
    if (problem !== undefined) {
      ctx.addIssue({ code: 'custom', path: ['spec'], message: problem });
    }
  })
);
