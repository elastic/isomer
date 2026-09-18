/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PackTypes,
  PrimitiveRenderContext,
  PrimitiveStyleCollector,
} from '@elastic/isomer-sdk';
import type {
  SlackAssetCollector,
  SlackBlock,
} from '@elastic/isomer-sdk/slack';

/**
 * The pack types a runtime dispatches with: the host's render context, Block
 * Kit for Slack, and everything else erased, because one inventory serves
 * every pack.
 */
export interface RuntimePackTypes<
  TRenderContext = PrimitiveRenderContext,
> extends PackTypes {
  theme: unknown;
  context: TRenderContext;
  collector: PrimitiveStyleCollector;
  slackBlock: SlackBlock;
  slackCollector: SlackAssetCollector;
}
