/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BodyNodeBase } from './body_node_base';

/**
 * One node in a `Composition`'s body, erased to its discriminator.
 *
 * A pack narrows `type` to its own literal union; the SDK holds this form
 * because a heterogeneous inventory has no single node type to name.
 */
export interface PrimitiveNode extends BodyNodeBase {
  type: string;
}

/** The same type as {@link PrimitiveNode}, kept for hosts that name body nodes. */
export type BodyNode = PrimitiveNode;
