/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '../../composition/composition';
import type { PrimitiveNode } from '../../define/primitive_module';
import type { TextEnvelopeDispatcher } from '../text/envelope';

import { md, serializeMarkdown } from './builder';

/** Adds GFM to {@link TextEnvelopeDispatcher}. */
export interface MarkdownEnvelopeDispatcher<
  TNode extends PrimitiveNode,
> extends TextEnvelopeDispatcher<TNode> {
  /** Returns the empty string for a node with nothing to show; the envelope drops it rather than emitting a blank block. */
  renderMarkdown(node: TNode): string;
}

/** Options for {@link renderMarkdownEnvelope}. */
export interface MarkdownEnvelopeOptions {
  /** Renders the composition's title and subtitle. Defaults to `true`. Pass `false` when the host already shows the title, or the body opens with its own. */
  heading?: boolean;
}

/**
 * The composition as GFM: title as `h1`, subtitle italicized, then every node
 * that rendered anything. The title and subtitle are text, escaped by
 * {@link serializeMarkdown}.
 */
export const renderMarkdownEnvelope = <TNode extends PrimitiveNode>(
  composition: Composition<TNode>,
  dispatcher: MarkdownEnvelopeDispatcher<TNode>,
  { heading = true }: MarkdownEnvelopeOptions = {}
): string => {
  const blocks: string[] = [];
  if (heading && composition.title) {
    blocks.push(serializeMarkdown(md.heading(1, composition.title)));
  }
  if (heading && composition.subtitle) {
    blocks.push(
      serializeMarkdown(md.paragraph(md.emphasis(composition.subtitle)))
    );
  }
  for (const node of composition.body) {
    const rendered = dispatcher.renderMarkdown(node);
    if (rendered.length > 0) {
      blocks.push(rendered);
    }
  }
  return blocks.join('\n\n');
};
