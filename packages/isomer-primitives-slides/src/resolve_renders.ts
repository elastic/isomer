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

const isUnresolvedRender = (
  node: PrimitiveNode
): node is SlideRenderNode & { slide: string } =>
  node.type === 'slideRender' &&
  typeof (node as SlideRenderNode).slide === 'string' &&
  (node as SlideRenderNode).composition === undefined;

// A JSON string that also escapes the line separators `JSON.stringify` leaves raw, so a message stays on one line.
const quote = (slug: string): string =>
  JSON.stringify(slug).replace(
    /[\u2028\u2029]/g,
    (separator) => `\\u${separator.charCodeAt(0).toString(16)}`
  );

/** Options for {@link resolveSlideRenders}. */
export interface ResolveSlideRendersOptions {
  /**
   * `throw` (the default) rejects a reference it cannot fill; `leave` keeps it
   * unresolved, so the slide draws its placeholder instead.
   */
  onUnresolved?: 'throw' | 'leave';
}

/**
 * Fills in every `slideRender` that names a `slide` but has no `composition`
 * with that slide's composition, so the pack can draw it.
 *
 * An unknown slug, a slide embedding itself, and a slide embedding one that
 * holds a render of its own (which covers any cycle) cannot be filled. A slug
 * that names more than one slide throws, whatever `onUnresolved` says.
 */
export const resolveSlideRenders = (
  slides: readonly NamedSlide[],
  { onUnresolved = 'throw' }: ResolveSlideRendersOptions = {}
): Composition[] => {
  const fail = (node: SlideRenderNode, message: string): SlideRenderNode => {
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
      if (!isUnresolvedRender(node)) {
        return node;
      }
      const { slide } = node;
      const target = bySlug.get(slide);
      if (!target) {
        return fail(
          node,
          `slide ${quote(slug)} renders unknown slide ${quote(slide)}`
        );
      }
      if (target.slug === slug) {
        return fail(node, `slide ${quote(slug)} renders itself`);
      }
      if (findNestedRender(target.composition.body)) {
        return fail(
          node,
          `slide ${quote(slug)} renders slide ${quote(target.slug)}, which holds a render of its own; an embedded composition cannot embed another render`
        );
      }
      return { ...node, composition: target.composition } as SlideRenderNode;
    })
  );
};
