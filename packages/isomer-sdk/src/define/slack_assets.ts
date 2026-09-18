/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '../composition/node';

/**
 * One image the host must upload before the message can be posted.
 *
 * The renderer is pure, so it emits `ref` as a placeholder and the host swaps
 * in Slack's file id once the upload lands.
 */
export interface SlackAssetRequest<
  TNode extends PrimitiveNode = PrimitiveNode,
> {
  /** Placeholder the render emits, which the host replaces with Slack's file id. */
  ref: string;
  /** The node to draw as an image, to be rendered on the `svg` surface. */
  node: TNode;
  /** Accessible description, required because Slack rejects an image block without one. */
  altText: string;
}

/**
 * Accumulates the {@link SlackAssetRequest}s a render produced.
 *
 * Opt-in: without a collector, a node that cannot draw inline degrades to text
 * instead, so default output stays safe for callers that cannot upload files.
 */
export interface SlackAssetCollector<
  TNode extends PrimitiveNode = PrimitiveNode,
> {
  /** Reserves a placeholder `ref` for `node` and records the request. */
  allocate(node: TNode, altText: string): string;
  /** In allocation order, so a host can upload and swap refs in one pass. */
  readonly requests: readonly SlackAssetRequest<TNode>[];
}
