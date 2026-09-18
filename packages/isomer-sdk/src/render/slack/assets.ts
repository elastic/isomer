/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '../../composition/node';
import type {
  SlackAssetCollector,
  SlackAssetRequest,
} from '../../define/slack_assets';

import { SLACK_LIMITS } from './blocks';
import { clampSlackText } from './format';

export type { SlackAssetCollector, SlackAssetRequest };

/**
 * Whether Slack's servers can fetch `src` themselves. `https:` only, so a data
 * URL or a host-relative path has to go through an upload instead.
 */
export const isSlackReachableImageUrl = (src: string): boolean =>
  /^https:\/\//i.test(src);

/**
 * A fresh {@link SlackAssetCollector} handing out `{prefix}-0`, `{prefix}-1`,
 * … in allocation order. `prefix` defaults to `asset`.
 */
export const createSlackAssetCollector = <
  TNode extends PrimitiveNode = PrimitiveNode,
>(
  options: { prefix?: string } = {}
): SlackAssetCollector<TNode> => {
  const prefix = options.prefix ?? 'asset';
  const requests: SlackAssetRequest<TNode>[] = [];
  let counter = 0;
  return {
    allocate: (node, altText) => {
      const ref = `${prefix}-${counter}`;
      counter += 1;
      // Clamped at allocation so a host reading `requests` for an upload title
      // sees the same string as the block it accompanies.
      requests.push({
        ref,
        node,
        altText: clampSlackText(altText, SLACK_LIMITS.imageAltTextChars),
      });
      return ref;
    },
    get requests() {
      return requests;
    },
  };
};
