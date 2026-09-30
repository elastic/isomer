/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type Composition,
  mapCompositionNodes,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';

import { findNestedRender } from './primitives/slide_render/embedded';
import type { SlideRenderNode } from './primitives/slide_render/types';
import { slideDeckPrimitives } from './registry';

/** One slide of a deck, addressed by the slug a `slideRender.slide` names. */
export interface NamedSlide {
  slug: string;
  composition: Composition;
}

export interface ResolveSlideRendersOptions {
  /** `throw` (the default) rejects a reference it cannot fill; `leave` keeps its placeholder. */
  onUnresolved?: 'throw' | 'leave';
}

const isUnresolved = (
  node: PrimitiveNode
): node is SlideRenderNode & { slide: string } =>
  node.type === 'slideRender' &&
  typeof (node as SlideRenderNode).slide === 'string' &&
  (node as SlideRenderNode).body === undefined;

const quote = (text: string) => JSON.stringify(text);

/**
 * Fills every `slideRender` that names a `slide` but has no `body` with that slide's body, anywhere in the deck.
 *
 * An unknown slug, a slide rendering itself, and a slide rendering one that holds a render of its own (which covers any cycle) cannot be filled. A slug naming two slides throws whatever `onUnresolved` says.
 */
export const resolveSlideRenders = (
  slides: readonly NamedSlide[],
  { onUnresolved = 'throw' }: ResolveSlideRendersOptions = {}
): Composition[] => {
  const fail = (node: PrimitiveNode, message: string): PrimitiveNode => {
    if (onUnresolved === 'leave') {
      return node;
    }
    throw new Error(`resolveSlideRenders: ${message}`);
  };
  const bySlug = new Map<string, NamedSlide>();
  for (const slide of slides) {
    if (bySlug.has(slide.slug)) {
      throw new Error(
        `resolveSlideRenders: slug ${quote(slide.slug)} names more than one slide`
      );
    }
    bySlug.set(slide.slug, slide);
  }
  return slides.map(({ slug, composition }) =>
    mapCompositionNodes(composition, slideDeckPrimitives, (node) => {
      if (!isUnresolved(node)) {
        return node;
      }
      const target = bySlug.get(node.slide);
      if (!target) {
        return fail(
          node,
          `slide ${quote(slug)} renders unknown slide ${quote(node.slide)}`
        );
      }
      if (target.slug === slug) {
        return fail(node, `slide ${quote(slug)} renders itself`);
      }
      if (findNestedRender(target.composition.body)) {
        return fail(
          node,
          `slide ${quote(slug)} renders slide ${quote(target.slug)}, which holds a render of its own`
        );
      }
      return { ...node, body: target.composition.body };
    })
  );
};
