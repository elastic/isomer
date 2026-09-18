/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '../../composition/composition';
import type { PrimitiveNode } from '../../define/primitive_module';

/** A pack's plain-text renderer for one node of its own type. */
export interface TextEnvelopeDispatcher<TNode extends PrimitiveNode> {
  /** Returns the empty string for a node with nothing to show; the envelope drops it rather than emitting a blank paragraph. */
  renderText(node: TNode): string;
}

/** The composition as plain text: title uppercased, subtitle, then nodes. */
export const renderTextEnvelope = <TNode extends PrimitiveNode>(
  composition: Composition<TNode>,
  dispatcher: TextEnvelopeDispatcher<TNode>
): string => {
  const lines = [
    composition.title?.toUpperCase(),
    composition.subtitle,
    ...composition.body.map((node) => dispatcher.renderText(node)),
  ].filter(Boolean);

  return lines.join('\n\n');
};
