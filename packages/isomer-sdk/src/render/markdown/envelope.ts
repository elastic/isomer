/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '../../composition/composition';
import type { PrimitiveNode } from '../../define/primitive_module';
import type { TextEnvelopeDispatcher } from '../text/envelope';

import { sanitizeMarkdownSource } from './format';

/** Adds GFM to {@link TextEnvelopeDispatcher}. */
export interface MarkdownEnvelopeDispatcher<
  TNode extends PrimitiveNode,
> extends TextEnvelopeDispatcher<TNode> {
  renderMarkdown(node: TNode): string;
}

/**
 * The composition as GFM: title as `h1`, subtitle italicized, then every node
 * that rendered anything. The title and subtitle go through
 * {@link sanitizeMarkdownSource}, the same URL policy a pack applies to its
 * own authored markdown.
 */
export const renderMarkdownEnvelope = <TNode extends PrimitiveNode>(
  composition: Composition<TNode>,
  dispatcher: MarkdownEnvelopeDispatcher<TNode>
): string => {
  const blocks: string[] = [];
  if (composition.title) {
    blocks.push(`# ${sanitizeMarkdownSource(composition.title)}`);
  }
  if (composition.subtitle) {
    blocks.push(`_${sanitizeMarkdownSource(composition.subtitle)}_`);
  }
  for (const node of composition.body) {
    const rendered = dispatcher.renderMarkdown(node);
    if (rendered.length > 0) {
      blocks.push(rendered);
    }
  }
  return blocks.join('\n\n');
};
