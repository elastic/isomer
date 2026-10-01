/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  checkInputBudget,
  type Composition,
  createChildNodeWalker,
  type InputBudget,
  type InputBudgetCheck,
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
  /** Every primitive the deck uses, so references and renders inside another pack's containers are found; defaults to this pack's. */
  primitives?: Parameters<typeof mapCompositionNodes>[1];
  /** Limits each slide is checked against before it is read; pass the runtime's `inputBudget` when it overrides one. */
  inputBudget?: InputBudget;
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
 * Each slide is read once, through {@link checkInputBudget}, and the deck is built from its plain copies. A slide the budget refuses throws, or with `leave` is returned unchanged. A reference to an unknown slug, to its own slide, to a slide the budget refuses, or to a slide that holds a render of its own in a child slot of `primitives` (which covers any cycle those slots can form) cannot be filled. A slug naming two slides always throws.
 */
export const resolveSlideRenders = (
  slides: readonly NamedSlide[],
  {
    onUnresolved = 'throw',
    primitives = slideDeckPrimitives,
    inputBudget,
  }: ResolveSlideRendersOptions = {}
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
  const walk = createChildNodeWalker(primitives);
  const checks = new Map<string, InputBudgetCheck>();
  const checked = ({ slug, composition }: NamedSlide): InputBudgetCheck => {
    let check = checks.get(slug);
    if (!check) {
      check = checkInputBudget(composition, inputBudget);
      checks.set(slug, check);
    }
    return check;
  };
  return slides.map((slide) => {
    const { slug, composition } = slide;
    const own = checked(slide);
    if (!own.valid) {
      if (onUnresolved === 'leave') {
        return composition;
      }
      throw new Error(
        `resolveSlideRenders: slide ${quote(slug)} cannot be checked: ${own.error.message}`
      );
    }
    return mapCompositionNodes(own.value as Composition, primitives, (node) => {
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
      const targetCheck = checked(target);
      if (!targetCheck.valid) {
        return fail(
          node,
          `slide ${quote(slug)} renders slide ${quote(target.slug)}, which cannot be checked: ${targetCheck.error.message}`
        );
      }
      const { body } = targetCheck.value as Composition;
      if (findNestedRender(body, walk).kind === 'found') {
        return fail(
          node,
          `slide ${quote(slug)} renders slide ${quote(target.slug)}, which holds a render of its own`
        );
      }
      return { ...node, body };
    });
  });
};
