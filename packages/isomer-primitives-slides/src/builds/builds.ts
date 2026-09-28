/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AnyPrimitiveDefinition,
  type ChildNodeWalker,
  type Composition,
  createChildNodeWalker,
  type EnhancementDefinition,
  findNodeElementPairs,
  isVisibleOnSurface,
  someBodyNode,
} from '@elastic/isomer-sdk';

import type { SlideContentNode } from '../body_node';
import { bulletListBuild } from '../primitives/slide_bullet_list/build';
import { listBuild } from '../primitives/slide_list/build';
import { pipelineBuild } from '../primitives/slide_pipeline/build';
import { sequenceBuild } from '../primitives/slide_sequence/build';
import { timelineBuild } from '../primitives/slide_timeline/build';
import { transcriptBuild } from '../primitives/slide_transcript/build';
import { slideDeckPrimitives } from '../registry';

import type { SlideBuild } from './types';

export const SLIDE_BUILDS = 'slideBuilds';

/** The primitives that build, and how. Every other node shows whole from the first click. */
const buildsByType = {
  slideBulletList: bulletListBuild,
  slideList: listBuild,
  slidePipeline: pipelineBuild,
  slideSequence: sequenceBuild,
  slideTimeline: timelineBuild,
  slideTranscript: transcriptBuild,
} satisfies Partial<Record<SlideContentNode['type'], SlideBuild<never>>>;

const buildOf = (node: unknown): SlideBuild<never> | undefined => {
  const { type } = node as { type?: unknown };
  return typeof type === 'string' && Object.hasOwn(buildsByType, type)
    ? buildsByType[type as keyof typeof buildsByType]
    : undefined;
};

/** Each building node of `body`, in reading order, skipping what `react` does not draw. */
const buildingNodes = (
  body: readonly unknown[],
  walk: ChildNodeWalker
): unknown[] =>
  body.flatMap((node) =>
    isVisibleOnSurface(node, 'react')
      ? [
          ...(buildOf(node) ? [node] : []),
          ...buildingNodes(
            walk(node).map((child) => child.node),
            walk
          ),
        ]
      : []
  );

/** Hides the parts of an ordered primitive until the host reveals them, one per click. */
export const slideBuildsEnhancement: EnhancementDefinition = {
  id: SLIDE_BUILDS,
  appliesTo: (body, walk) =>
    someBodyNode(body, 'react', (node) => buildOf(node) !== undefined, walk),
  anchors: true,
};

/** How many clicks `composition` takes to finish building. */
export const slideBuilds = (
  { body }: Composition,
  primitives: readonly AnyPrimitiveDefinition[] = slideDeckPrimitives
): number =>
  buildingNodes(body, createChildNodeWalker(primitives)).reduce(
    (total: number, node) => total + buildOf(node)!.count(node as never),
    0
  );

const hasStyle = (element: Element): element is HTMLElement =>
  'style' in element;

/** One building node's parts as rendered under a root. */
export interface SlideBuildParts {
  node: unknown;
  count: number;
  /** Each part's elements, as far as they were found. */
  units: Element[][];
  /** Whether every part was found, so the node can build. */
  found: boolean;
}

/**
 * Each building node of `composition`, in click order, with its parts as
 * rendered under `root`. The render must carry node anchors, as it does with
 * {@link SLIDE_BUILDS} requested.
 */
export const slideBuildParts = (
  root: ParentNode,
  { body }: Composition,
  primitives: readonly AnyPrimitiveDefinition[] = slideDeckPrimitives
): SlideBuildParts[] => {
  // Paired by occurrence, so a node object that appears twice builds twice.
  return findNodeElementPairs(root, body, createChildNodeWalker(primitives))
    .filter(({ node }) => buildOf(node) !== undefined)
    .map(({ node, element: owner }) => {
      const build = buildOf(node)!;
      const count = build.count(node as never);
      const units = owner ? build.units(owner, node as never) : [];
      const found =
        units.length === count && units.every((unit) => unit.length > 0);
      return { node, count, units, found };
    });
};

/** Marks what {@link showSlideBuild} hid, so the next call can show it again wherever React reused it. */
const HIDDEN_ATTRIBUTE = 'data-slide-build-hidden';

/**
 * Shows the first `step` parts of `composition` as rendered under `root`, and
 * hides the rest while keeping their layout box. A node whose parts cannot all
 * be found stays whole.
 */
export const showSlideBuild = (
  root: ParentNode,
  composition: Composition,
  step: number,
  primitives: readonly AnyPrimitiveDefinition[] = slideDeckPrimitives
): void => {
  for (const element of root.querySelectorAll(`[${HIDDEN_ATTRIBUTE}]`)) {
    element.removeAttribute(HIDDEN_ATTRIBUTE);
    if (hasStyle(element)) {
      element.style.visibility = '';
    }
  }
  let offset = 0;
  for (const { count, units, found } of slideBuildParts(
    root,
    composition,
    primitives
  )) {
    if (found) {
      units.slice(Math.max(step - offset, 0)).forEach((unit) =>
        unit.filter(hasStyle).forEach((element) => {
          element.setAttribute(HIDDEN_ATTRIBUTE, '');
          element.style.visibility = 'hidden';
        })
      );
    }
    offset += count;
  }
};
