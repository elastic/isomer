/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, Fragment, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  type BoundFrame,
  type CheckedComposition,
  type CheckedValidationResult,
  type Composition,
  compositionToRender,
  createChildNodeWalker,
  type FrameDispatcher,
  type FrameSizing,
  IsomerError,
  type PrimitiveDispatcher,
  type PrimitiveNode,
  type PrimitiveStyleCollector,
  type RenderTheme,
  type ValidationErrorMode,
  withNodeAnchors,
} from '@elastic/isomer-sdk';
import {
  collectHTMLStyles,
  type HTMLRenderOptions,
  type HTMLStyleAdapter,
} from '@elastic/isomer-sdk/html';

import type { RuntimePackTypes } from '../pack_types';

import { checkNode } from './check_node';
import {
  collectSnapshotHeightWarnings,
  type SnapshotHeightWarning,
} from './snapshot_height';

export type { SnapshotHeightWarning };

/** Options for {@link SnapshotSurface.render} and {@link SnapshotSurface.renderPages}. */
export interface SnapshotRenderOptions {
  /** Which of the runtime's frames this render uses; defaults to its `defaultFrame`. */
  frame?: string;
  /** Overrides the frame's `defaultWidth`. */
  width?: number;
  /** Overrides the frame's estimated height, and its `sizing`: the result's `heightMode` is `fixed`. */
  height?: number;
  /** Theme mode; falls back to the composition's own `theme`. `auto` resolves light. */
  theme?: RenderTheme;
  /** Defaults to `'throw'`: an image is all or nothing. `'collect'` renders anyway. */
  onValidationError?: ValidationErrorMode;
  /** Renders node anchors, e.g. so `checkLayout` can pair a measured layout with its nodes. */
  anchors?: boolean;
}

/**
 * Options for {@link SnapshotSurface.renderNode}.
 *
 * Geometry is absent deliberately: one node is drawn with no surround, so there
 * is nothing for a width or a height to size.
 */
export type SnapshotRenderNodeOptions = Pick<
  SnapshotRenderOptions,
  'frame' | 'theme' | 'anchors' | 'onValidationError'
>;

/** One drawn page, as a React tree and as the static markup of that same tree. */
export interface SnapshotPage {
  /** A single root element, as image layout requires. */
  element: ReactNode;
  /** `element` rendered to static markup, for a backend that takes HTML. */
  html: string;
}

/**
 * A page and the stylesheet it is laid out against.
 *
 * Both are needed together: the page carries class names, and a rasterizer is
 * given `css` the way a browser is given a `<style>`. Everything but `element`
 * is plain data, so a host can cache it or rasterize it in another process.
 */
export interface SnapshotRenderResult extends SnapshotPage {
  /** The pack's CSS, with `light-dark(…)` already resolved to this render's scheme. */
  css: string;
  width: number;
  /** The frame's estimate, or the caller's `height`. Under `heightMode: 'content'`, a backend measures instead. */
  height: number;
  /**
   * `content` when the frame's `sizing` is `content` and no `height` was
   * given: `height` is an estimate, and an image backend sizes the output to
   * the laid-out root. `fixed` otherwise.
   */
  heightMode: FrameSizing;
  /**
   * Nodes this render measured as 0. Empty when `estimateHeight` never calls
   * `estimateSnapshotHeight`, when `height` is given, or when the frame sizes
   * to content.
   */
  warnings: readonly SnapshotHeightWarning[];
}

/** Several compositions laid out against one stylesheet, one page each, as a paged document needs. */
export interface SnapshotPagesResult {
  /** One page per composition, in order. */
  pages: readonly SnapshotPage[];
  /** The pack's CSS for every page, with `light-dark(…)` resolved to the document's scheme. */
  css: string;
  /** Every page's width. */
  width: number;
  /** Every page's height: the tallest estimate, or the caller's `height`. */
  height: number;
  /**
   * As on {@link SnapshotRenderResult}. Under `content` a backend measures
   * every page and sizes them all to the tallest.
   */
  heightMode: FrameSizing;
  /**
   * Nodes measured as 0, paths prefixed `pages[n].`. Empty when `height` is
   * given, when `estimateHeight` never calls `estimateSnapshotHeight`, or when
   * the frame sizes to content.
   */
  warnings: readonly SnapshotHeightWarning[];
}

/**
 * Renders a composition or node once, inside a frame, at a fixed size and one
 * color scheme: the same React tree the DOM gets, its markup, and the pack's
 * stylesheet.
 *
 * Rasterizing a snapshot to PNG, SVG, or PDF is a separate capability a host
 * opts into.
 */
export interface SnapshotSurface {
  /** Always `true`: this surface validates the composition and renders the copy it checked, never the caller's value. */
  readonly validating: true;
  /** Renders a full composition inside the chosen frame. */
  render(
    composition: Composition,
    options?: SnapshotRenderOptions
  ): SnapshotRenderResult;
  /**
   * Renders several compositions under one frame with one stylesheet, one
   * page each. Every page is the same size, the tallest estimate unless
   * `height` is given (under a `content` frame, the tallest laid-out page,
   * which the backend measures), and the first composition's `theme` decides
   * the palette unless `theme` is given. `warnings` names nodes that estimate
   * measured as 0, under `pages[n].`.
   *
   * Throws `EMPTY_PAGES` for an empty list, and validates each composition in
   * order as {@link SnapshotSurface.render} does.
   */
  renderPages(
    compositions: readonly Composition[],
    options?: SnapshotRenderOptions
  ): SnapshotPagesResult;
  /**
   * Renders a single primitive node with no surround. The result's `width` is
   * the frame's `defaultWidth`, its `height` the frame's estimate for a
   * one-node body, and its `heightMode` the frame's `sizing`.
   */
  renderNode(
    node: PrimitiveNode,
    options?: SnapshotRenderNodeOptions
  ): SnapshotRenderResult;
}

/**
 * A frame together with the name the host registered it under.
 */
export interface NamedFrame {
  readonly name: string;
  readonly frame: BoundFrame;
}

/** `auto` resolves light: an image is one static frame with no media query to read. */
const schemeFor = (mode: RenderTheme | undefined): 'light' | 'dark' =>
  mode === 'dark' ? 'dark' : 'light';

/**
 * Creates the `snapshot` {@link RuntimeSurfaces} entry.
 *
 * Built only when a host supplies a frame: unlike the other five surfaces, a
 * snapshot cannot fall back to a generic envelope, because a frame is a
 * whole-document decision.
 */
export const createSnapshotSurface = <TRenderContext = unknown>(
  dispatcher: PrimitiveDispatcher<
    PrimitiveNode,
    RuntimePackTypes<TRenderContext>
  >,
  validate: (composition: Composition) => CheckedValidationResult,
  frameFor: (name: string | undefined) => NamedFrame,
  styleAdapter:
    | HTMLStyleAdapter<PrimitiveNode, PrimitiveStyleCollector, TRenderContext>
    | undefined
): SnapshotSurface => {
  /** A composition and how to draw it once a render context exists. */
  interface StyledPage {
    composition: Composition;
    build: (context: TRenderContext) => ReactNode;
  }

  const assertBody = (
    { name, frame }: NamedFrame,
    composition: Composition,
    subject: string
  ): void => {
    const errors = frame.validateBody(composition.body);
    if (errors.length > 0) {
      throw new IsomerError(
        'INVALID_FRAME_BODY',
        `runtime: frame "${name}" cannot draw ${subject}: ${errors.join('; ')}`
      );
    }
  };

  /**
   * Height from `estimateHeight`, and warnings when that call reads
   * `estimateSnapshotHeight` on a `fixed` frame. A `content` frame's estimate
   * is not the size drawn, so a node it measures as 0 sizes nothing short.
   */
  const measuredHeight = (
    frame: BoundFrame,
    composition: Composition,
    prefix: string
  ): { height: number; warnings: readonly SnapshotHeightWarning[] } => {
    let consulted = false;
    const height = frame.estimateHeight(composition, {
      renderSnapshot: () => null,
      estimateSnapshotHeight: (node) => {
        consulted = true;
        return dispatcher.estimateSnapshotHeight(node);
      },
    });
    return {
      height,
      warnings:
        consulted && frame.sizing === 'fixed'
          ? collectSnapshotHeightWarnings(
              dispatcher.definitions,
              composition.body,
              prefix
            )
          : [],
    };
  };

  /** The tallest estimate, unless `height` is given, which fixes the height and leaves `warnings` empty. */
  const viewportFor = (
    frame: BoundFrame,
    compositions: readonly Composition[],
    options: Pick<SnapshotRenderOptions, 'width' | 'height'>,
    pagePaths: boolean
  ): {
    width: number;
    height: number;
    heightMode: FrameSizing;
    warnings: readonly SnapshotHeightWarning[];
  } => {
    const width = options.width ?? frame.defaultWidth;
    if (options.height !== undefined) {
      return {
        width,
        height: options.height,
        heightMode: 'fixed',
        warnings: [],
      };
    }
    const measured = compositions.map((composition, index) =>
      measuredHeight(frame, composition, pagePaths ? `pages[${index}]` : '')
    );
    return {
      width,
      height: Math.max(...measured.map(({ height }) => height)),
      heightMode: frame.sizing,
      warnings: measured.flatMap(({ warnings }) => warnings),
    };
  };

  const frameDispatcherFor = (
    context: TRenderContext,
    theme: unknown,
    anchors: boolean | undefined
  ): FrameDispatcher => {
    const drawn = anchors === true ? withNodeAnchors(context) : context;
    return {
      renderSnapshot: (node, key) =>
        dispatcher.renderSnapshot(node, drawn, theme, key),
      estimateSnapshotHeight: (node) => dispatcher.estimateSnapshotHeight(node),
    };
  };

  /**
   * One collector spans every page, so a document gets one stylesheet; the
   * adapter settles its options against the first page. An image runs no
   * script, so no enhancement reaches the style pass.
   */
  const withStyles = (
    [first, ...rest]: readonly [StyledPage, ...StyledPage[]],
    scheme: 'light' | 'dark'
  ): { pages: SnapshotPage[]; css: string } => {
    const pages = [first, ...rest];
    const requested: HTMLRenderOptions = {
      theme: scheme,
      scheme,
    };
    const { context, css } = collectHTMLStyles<
      PrimitiveNode,
      PrimitiveStyleCollector,
      TRenderContext
    >({
      dispatcher,
      styleAdapter,
      options:
        styleAdapter?.resolveOptions?.(first.composition, requested) ??
        requested,
      compositions: pages.map(({ composition }) => composition),
      scope: {
        walk: createChildNodeWalker(dispatcher.definitions),
        definitions: [],
      },
      render: (collecting) =>
        createElement(
          Fragment,
          null,
          ...pages.map(({ build }) => build(collecting))
        ),
    });
    return {
      pages: pages.map(({ build }) => {
        const element = build(context);
        return { element, html: renderToStaticMarkup(element) };
      }),
      css,
    };
  };

  /** `subject` names a page in the frame's rejection, e.g. `page 2`. */
  const renderDocument = (
    [head, ...tail]: readonly [Composition, ...Composition[]],
    options: SnapshotRenderOptions,
    subject: (index: number) => string,
    pagePaths: boolean
  ): SnapshotPagesResult => {
    const check = (composition: Composition): CheckedComposition =>
      compositionToRender(
        validate(composition),
        options.onValidationError ?? 'throw'
      );
    const first = check(head);
    const rest = tail.map(check);
    const compositions = [first, ...rest];
    const named = frameFor(options.frame);
    compositions.forEach((composition, index) => {
      assertBody(named, composition, subject(index));
    });
    const { warnings, heightMode, ...size } = viewportFor(
      named.frame,
      compositions,
      options,
      pagePaths
    );
    const mode = options.theme ?? first.theme;
    const theme = named.frame.resolveTheme(mode);
    const page = (composition: CheckedComposition): StyledPage => ({
      composition,
      build: (context) =>
        named.frame.render(
          composition,
          { ...size, mode },
          frameDispatcherFor(context, theme, options.anchors)
        ),
    });
    const { pages, css } = withStyles(
      [page(first), ...rest.map(page)],
      schemeFor(mode)
    );
    return { ...size, heightMode, warnings, pages, css };
  };

  return {
    validating: true,
    render: (composition, options = {}) => {
      const {
        pages: [page],
        ...viewport
      } = renderDocument(
        [composition],
        options,
        () => 'this composition',
        false
      );
      return { ...viewport, ...page! };
    },
    renderPages: (compositions, options = {}) => {
      const [first, ...rest] = compositions;
      if (first === undefined) {
        throw new IsomerError(
          'EMPTY_PAGES',
          'runtime: renderPages needs at least one composition'
        );
      }
      return renderDocument(
        [first, ...rest],
        options,
        (index) => `page ${index + 1}`,
        true
      );
    },
    renderNode: (node, options = {}) => {
      const { composition, node: checked } = checkNode(
        validate,
        node,
        options.onValidationError ?? 'throw'
      );
      const { frame } = frameFor(options.frame);
      const theme = frame.resolveTheme(options.theme);
      const { height, warnings } = measuredHeight(frame, composition, '');
      const {
        pages: [page],
        css,
      } = withStyles(
        [
          {
            composition,
            build: (context) =>
              frame.renderNode(
                checked,
                frameDispatcherFor(context, theme, options.anchors)
              ),
          },
        ],
        schemeFor(options.theme)
      );
      return {
        width: frame.defaultWidth,
        height,
        heightMode: frame.sizing,
        warnings,
        ...page!,
        css,
      };
    },
  };
};
