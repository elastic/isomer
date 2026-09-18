/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneElement, isValidElement, type ReactNode } from 'react';

import { isVisibleOnSurface } from '../composition/body_node_base';
import { IsomerError } from '../composition/error';
import type { ValidationError } from '../composition/validation_error';
import {
  type AnyPrimitiveDefinition,
  type DefaultPackTypes,
  type PackTypes,
  type PrimitiveNode,
  type PrimitiveStyleCollectionContext,
  type ReactContextArg,
  type Renderer,
  type RenderScope,
  type SurfaceMap,
  type SurfaceName,
  validateWithSchema,
} from '../define/primitive_module';

import type { SlackAssetCollector } from './slack/assets';
import type { SlackBlock, SlackImageBlock } from './slack/blocks';
import { gfmToSlackBlocks } from './slack/format';

/**
 * Renders a node on any surface by looking its `type` up in one flattened
 * inventory.
 *
 * The seam that makes packs composable: a container recurses through the
 * {@link RenderScope} it is passed rather than through its own pack, so a node
 * owned by another pack still renders.
 */
export interface PrimitiveDispatcher<
  TNode extends PrimitiveNode,
  T extends PackTypes = DefaultPackTypes,
> {
  /** Every primitive this dispatcher can reach, across all composed packs. */
  readonly definitions: readonly AnyPrimitiveDefinition[];
  /** Throws for an unknown node type; a missing primitive is a bug, not a degradation. */
  getDefinition(node: TNode): AnyPrimitiveDefinition;
  /** `undefined` when the primitive declares no renderer for `surface`. */
  renderOn<S extends SurfaceName>(
    surface: S,
    node: TNode,
    extras: Omit<SurfaceMap<T>[S]['env'], 'scope'>
  ): SurfaceMap<T>[S]['output'] | undefined;
  renderReact(
    node: TNode,
    ...context: ReactContextArg<T['context']>
  ): ReactNode;
  /** Mutates `styles` with this node's contribution. */
  collectStyles(
    node: TNode,
    styles: T['collector'],
    context: PrimitiveStyleCollectionContext
  ): void;
  /**
   * The node's `react` renderer, gated on `svg` visibility and keyed for a
   * frame's sibling list. `key` must be unique among those siblings.
   * `theme` is the frame's resolved palette for this render, or `undefined`
   * outside a frame.
   */
  renderSvg(
    node: TNode,
    context: T['context'],
    theme: T['theme'] | undefined,
    key: string
  ): ReactNode;
  renderText(node: TNode): string;
  renderMarkdown(node: TNode): string;
  /**
   * Empty only when the node is hidden from `slack` or `sanitize` drops it. A
   * node with no `slack` renderer degrades through its markdown.
   */
  renderSlack(
    node: TNode,
    collector?: T['slackCollector']
  ): readonly T['slackBlock'][];
  /** `0` when the node is hidden from `svg` or its primitive declares no `metrics.svgHeight`. */
  estimateSvgHeight(node: TNode): number;
  /** Appends schema failures under `path` to `errors`. */
  validate(node: TNode, path: string, errors: ValidationError[]): void;
}

/**
 * Which of a definition's renderers each surface dispatches to.
 *
 * `svg` maps to `react`: an image backend lays out the pack's DOM tree and
 * stylesheet, so the two surfaces differ only in visibility and in what
 * surrounds them.
 */
const RENDERER_FOR_SURFACE = {
  react: 'react',
  svg: 'react',
  text: 'text',
  markdown: 'markdown',
  slack: 'slack',
} as const satisfies Record<
  SurfaceName,
  keyof AnyPrimitiveDefinition['renderers']
>;

/** Runtime facts {@link createPrimitiveDispatcher} cannot derive from the inventory. */
export interface PrimitiveDispatcherOptions {
  /** Names this dispatcher in error messages. */
  label?: string;
  /**
   * Which node types render as a picture rather than as text, so the Slack
   * surface uploads an image instead of degrading to markdown. Supplied by the
   * runtime from each pack's `slackAssetTypes`.
   */
  isSlackAssetType?: ((type: string) => boolean) | undefined;
}

/**
 * Flattens `definitions` into one type-keyed inventory.
 *
 * Throws on a duplicate `type`: two packs claiming one node type has no correct
 * resolution, so it fails at construction rather than resolving arbitrarily per
 * render.
 */
export const createPrimitiveDispatcher = <
  TNode extends PrimitiveNode,
  T extends PackTypes = DefaultPackTypes,
>(
  definitions: readonly AnyPrimitiveDefinition[],
  options: PrimitiveDispatcherOptions = {}
): PrimitiveDispatcher<TNode, T> => {
  const { isSlackAssetType } = options;
  const byType = new Map<string, AnyPrimitiveDefinition>();
  for (const definition of definitions) {
    const existing = byType.get(definition.type);
    if (existing) {
      const label = options.label ? `${options.label}: ` : '';
      throw new IsomerError(
        'DUPLICATE_PRIMITIVE_TYPE',
        `${label}duplicate primitive type "${definition.type}" registered`
      );
    }
    byType.set(definition.type, definition);
  }

  const getDefinition = (node: TNode): AnyPrimitiveDefinition => {
    const definition = byType.get(node.type);
    if (!definition) {
      throw new IsomerError(
        'UNKNOWN_PRIMITIVE_TYPE',
        `Unknown primitive type "${node.type}"`
      );
    }
    return definition;
  };

  const sanitizeNode = (
    definition: AnyPrimitiveDefinition,
    node: TNode
  ): TNode | null => {
    const sanitize = definition.sanitize as
      ((node: TNode) => TNode | null) | undefined;
    return sanitize ? sanitize(node) : node;
  };

  // Assigned after helpers that close over this binding.
  // eslint-disable-next-line prefer-const
  let self: PrimitiveDispatcher<TNode, T>;

  const scope = (): RenderScope<T> => self;

  const renderOn = <S extends SurfaceName>(
    surface: S,
    node: TNode,
    extras: Omit<SurfaceMap<T>[S]['env'], 'scope'>
  ): SurfaceMap<T>[S]['output'] | undefined => {
    if (!isVisibleOnSurface(node, surface)) {
      return undefined;
    }
    const definition = getDefinition(node);
    const renderer = definition.renderers[RENDERER_FOR_SURFACE[surface]] as
      Renderer<TNode, S, T> | undefined;
    if (!renderer) {
      return undefined;
    }
    const safeNode = sanitizeNode(definition, node);
    return safeNode === null
      ? undefined
      : renderer(safeNode, { ...extras, scope: scope() });
  };

  const renderMarkdown = (node: TNode): string =>
    renderOn('markdown', node, {}) ?? '';

  self = {
    definitions,
    getDefinition,
    renderOn,
    // `{}` only ever runs when the argument was optional, which
    // `ReactContextArg` allows exactly when `{}` is a complete context.
    renderReact: (node, ...context) =>
      renderOn('react', node, {
        context: context[0] ?? {},
      }),
    collectStyles: (node, styles, context) => {
      const definition = getDefinition(node);
      const collectStyles = definition.collectStyles as
        | ((
            node: TNode,
            env: {
              styles: T['collector'];
              context: PrimitiveStyleCollectionContext;
            }
          ) => void)
        | undefined;
      collectStyles?.(node, { styles, context });
    },
    renderSvg: (node, context, theme, key) => {
      const rendered = renderOn('svg', node, { context, theme });
      // The frame hands these to React as an array; a `key` has to sit on the
      // element itself, since wrapping in a Fragment would hide the single
      // root an image backend lays out from.
      return isValidElement(rendered)
        ? cloneElement(rendered, { key })
        : rendered;
    },
    renderText: (node) => renderOn('text', node, {}) ?? '',
    renderMarkdown,
    renderSlack: (node, collector) => {
      if (!isVisibleOnSurface(node, 'slack')) {
        return [];
      }
      const assets = isSlackAssetCollector(collector) ? collector : undefined;
      if (assets && isSlackAssetType?.(node.type)) {
        const altText = renderOn('text', node, {}) ?? node.type;
        const ref = assets.allocate(node, altText);
        const block = {
          type: 'image',
          alt_text: altText,
          slack_file: { ref },
        } satisfies SlackImageBlock;
        return asSlackPayload<T['slackBlock']>([block]);
      }
      const definition = getDefinition(node);
      const slackRenderer = definition.renderers.slack as
        Renderer<TNode, 'slack', T> | undefined;
      if (!slackRenderer) {
        // Degrading here rather than in the envelope is what reaches nested
        // children: a container's `slack` renderer recurses through this
        // method, and the envelope only ever sees the container's own output.
        return asSlackPayload<T['slackBlock']>(
          gfmToSlackBlocks(renderMarkdown(node))
        );
      }
      const safeNode = sanitizeNode(definition, node);
      if (safeNode === null) {
        return [];
      }
      const rendered = slackRenderer(safeNode, {
        ...(collector === undefined ? {} : { collector }),
        scope: scope(),
      });
      return isReadonlyArray(rendered) ? rendered : [rendered];
    },
    estimateSvgHeight: (node) => {
      if (!isVisibleOnSurface(node, 'svg')) {
        return 0;
      }
      const svgHeight = getDefinition(node).metrics?.svgHeight as
        ((node: TNode) => number) | undefined;
      return svgHeight?.(node) ?? 0;
    },
    validate: (node, path, errors) => {
      validateWithSchema(getDefinition(node).schema, node, path, errors);
    },
  };
  return self;
};

const isReadonlyArray = <T>(value: T | readonly T[]): value is readonly T[] =>
  Array.isArray(value);

/** The picture swap needs a collector that can allocate; any other collector type skips it. */
const isSlackAssetCollector = (value: unknown): value is SlackAssetCollector =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { allocate?: unknown }).allocate === 'function';

/** Rebinds checked Block Kit to the erased payload parameter. */
const asSlackPayload = <TSlackBlock>(
  blocks: readonly SlackBlock[]
): readonly TSlackBlock[] => blocks as unknown as readonly TSlackBlock[];
