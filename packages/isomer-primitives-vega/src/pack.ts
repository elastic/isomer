/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  definePrimitivePack,
  type EnhancementDefinition,
  type PrimitiveNode,
  type PrimitivePack,
  someBodyNode,
} from '@elastic/isomer-sdk';

import { VEGA_INTERACTIVE, vegaPrimitive } from './primitive';
import { vegaStyleAdapter } from './render/styles';

/**
 * Embeds each chart's compiled spec beside its SVG so `hydrateVega` from
 * `./client` can make it live. Host-driven: it ships no script.
 */
export const vegaInteractiveEnhancement: EnhancementDefinition = {
  id: VEGA_INTERACTIVE,
  appliesTo: (body, walk) =>
    someBodyNode(
      body,
      'react',
      (node) => (node as PrimitiveNode).type === 'vega',
      walk
    ),
};

/**
 * The input budget the pack declares, the charts pack's: a Vega node carries
 * its data inline, as a chart node does.
 */
export const VEGA_INPUT_BUDGET = {
  values: 250_000,
  characters: 10_000_000,
} as const;

/** The Vega pack: one `vega` primitive, drawn by the Vega runtime. */
export const vegaPack: PrimitivePack = definePrimitivePack({
  id: 'vega',
  primitives: [vegaPrimitive],
  enhancements: [vegaInteractiveEnhancement],
  slackAssetTypes: ['vega'],
  inputBudget: VEGA_INPUT_BUDGET,
  authoring: { groups: [{ title: 'Charts', types: ['vega'] }] },
  styleAdapter: vegaStyleAdapter,
});
