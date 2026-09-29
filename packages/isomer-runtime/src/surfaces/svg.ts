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
  type Composition,
  createChildNodeWalker,
  enforceValidationMode,
  type FrameDispatcher,
  IsomerError,
  type PrimitiveDispatcher,
  type PrimitiveNode,
  type PrimitiveStyleCollector,
  type RenderTheme,
  type ValidationErrorMode,
  type ValidationResult,
  withNodeAnchors,
} from '@elastic/isomer-sdk';
import {
  flattenSchemeOption,
  type HTMLRenderOptions,
  type HTMLStyleAdapter,
} from '@elastic/isomer-sdk/html';

import type { RuntimePackTypes } from '../pack_types';

export interface SvgRenderOptions {
  /** Which of the runtime's frames this render uses; defaults to its `defaultFrame`. */
  frame?: string;
  /** Overrides the frame's `defaultWidth`. */
  width?: number;
  /** Overrides the frame's estimated height. */
  height?: number;
  /** Theme mode; falls back to the composition's own `theme`. `auto` resolves light. */
  theme?: RenderTheme;
  /** Defaults to `'throw'`: an image is all or nothing. `'collect'` renders anyway. */
  onValidationError?: ValidationErrorMode;
  /** Renders node anchors, e.g. so `checkLayout` can pair a measured layout with its nodes. */
  anchors?: boolean;
}

/**
 * Options for {@link SvgSurface.renderNode}.
 *
 * Geometry is absent deliberately: one node is drawn with no surround, so there
 * is nothing for a width or a height to size.
 */
export type SvgRenderNodeOptions = Pick<
  SvgRenderOptions,
  'frame' | 'theme' | 'anchors'
>;

/**
 * A tree and the stylesheet it is laid out against.
 *
 * Both halves are needed together: the elements carry class names, and an
 * image backend is given `css` the way a browser is given a `<style>`. A
 * backend that takes only a tree can carry the stylesheet in one.
 */
export interface SvgRenderResult {
  /** The frame's output — a single root element, as image layout requires. */
  element: ReactNode;
  /** The pack's CSS, with `light-dark(…)` already resolved to this render's scheme. */
  css: string;
  width: number;
  height: number;
}

/** Several compositions laid out against one stylesheet, one page each, as a paged document needs. */
export interface SvgPagesResult {
  /** One root element per composition, in order. */
  pages: readonly ReactNode[];
  /** The pack's CSS for every page, with `light-dark(…)` resolved to the document's scheme. */
  css: string;
  /** Every page's width. */
  width: number;
  /** Every page's height. */
  height: number;
}

/**
 * Renders a composition or node to an image backend's input: the same React
 * tree the DOM gets, paired with the pack's stylesheet.
 *
 * `svg` is a render surface; projecting it to SVG, PNG, or PDF is a separate
 * capability a host opts into.
 */
export interface SvgSurface {
  /** Always `true`: this surface validates the composition before rendering. */
  readonly validating: true;
  /** Renders a full composition inside the chosen frame. */
  render(composition: Composition, options?: SvgRenderOptions): SvgRenderResult;
  /**
   * Renders several compositions under one frame with one stylesheet, one
   * page each. Every page is the same size, the tallest estimate unless
   * `height` is given, and the first composition's `theme` decides the palette
   * unless `theme` is given.
   *
   * Throws `EMPTY_PAGES` for an empty list, and validates each composition in
   * order as {@link SvgSurface.render} does.
   */
  renderPages(
    compositions: readonly Composition[],
    options?: SvgRenderOptions
  ): SvgPagesResult;
  /**
   * The width and height {@link SvgSurface.render} would use for this
   * composition. Rasterizing consumers need the viewport the element was laid
   * out for.
   *
   * Throws rather than returning a validation result when the named frame is
   * not one this runtime holds. Unlike {@link SvgSurface.render} it does not
   * validate first, and a rasterizing host naturally calls it first.
   */
  resolveViewport(
    composition: Composition,
    options?: Pick<SvgRenderOptions, 'frame' | 'width' | 'height'>
  ): { width: number; height: number };
  /** Renders a single primitive node with no surround. */
  renderNode(
    node: PrimitiveNode,
    options?: SvgRenderNodeOptions
  ): SvgRenderResult;
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
 * Creates the `svg` {@link RuntimeSurfaces} entry.
 *
 * Built only when a host supplies a frame: unlike the other four surfaces, SVG
 * cannot fall back to a generic envelope, because a frame is a whole-document
 * decision.
 */
export const createSvgSurface = <TRenderContext = unknown>(
  dispatcher: PrimitiveDispatcher<
    PrimitiveNode,
    RuntimePackTypes<TRenderContext>
  >,
  validate: (composition: Composition) => ValidationResult,
  frameFor: (name: string | undefined) => NamedFrame,
  styleAdapter:
    | HTMLStyleAdapter<PrimitiveNode, PrimitiveStyleCollector, TRenderContext>
    | undefined
): SvgSurface => {
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

  /** For `estimateHeight`, which measures nodes rather than drawing them. */
  const measuringOnly: FrameDispatcher = {
    renderSvg: () => null,
    estimateSvgHeight: (node) => dispatcher.estimateSvgHeight(node),
  };

  /** One viewport for every composition: the tallest estimate, unless overridden. */
  const viewportFor = (
    frame: BoundFrame,
    compositions: readonly Composition[],
    options: Pick<SvgRenderOptions, 'width' | 'height'>
  ): { width: number; height: number } => ({
    width: options.width ?? frame.defaultWidth,
    height:
      options.height ??
      Math.max(
        ...compositions.map((composition) =>
          frame.estimateHeight(composition, measuringOnly)
        )
      ),
  });

  const frameDispatcherFor = (
    context: TRenderContext,
    theme: unknown,
    anchors: boolean | undefined
  ): FrameDispatcher => {
    const drawn = anchors === true ? withNodeAnchors(context) : context;
    return {
      renderSvg: (node, key) => dispatcher.renderSvg(node, drawn, theme, key),
      estimateSvgHeight: (node) => dispatcher.estimateSvgHeight(node),
    };
  };

  /**
   * Runs the pack twice, in the same hook order as the SDK's HTML envelope:
   * class names are collected as a side effect of rendering, so the stylesheet
   * only exists once a pass has resolved them. `react` renderers must therefore
   * be side-effect free. One collector spans every page, so a document gets
   * one stylesheet; the adapter settles its options against the first page.
   */
  const withStyles = (
    [first, ...rest]: readonly [StyledPage, ...StyledPage[]],
    scheme: 'light' | 'dark'
  ): { elements: ReactNode[]; css: string } => {
    const pages = [first, ...rest];
    if (!styleAdapter) {
      return {
        elements: pages.map(({ build }) => build({} as TRenderContext)),
        css: '',
      };
    }
    const requested: HTMLRenderOptions = {
      theme: scheme,
      adapterOptions: { [flattenSchemeOption]: scheme },
    };
    const options =
      styleAdapter.resolveOptions?.(first.composition, requested) ?? requested;
    const collector = styleAdapter.createCollector(options);
    styleAdapter.collectWrapperStyles?.(collector, options);
    const scope = {
      walk: createChildNodeWalker(dispatcher.definitions),
      definitions: [],
    };
    for (const { composition } of pages) {
      styleAdapter.collectViewStyles?.(
        composition,
        dispatcher,
        collector,
        { fluid: Boolean(options.fluid) },
        options,
        scope
      );
    }
    const collecting = styleAdapter.createRenderContext(collector, options);
    renderToStaticMarkup(
      createElement(
        Fragment,
        null,
        ...pages.map(({ build }) => build(collecting))
      )
    );
    for (const { composition } of pages) {
      styleAdapter.collectAfterRender?.(composition, collector, options);
    }
    const context = styleAdapter.createRenderContext(collector, options);
    return {
      elements: pages.map(({ build }) => build(context)),
      css: styleAdapter.renderStyles(collector, options),
    };
  };

  /** `subject` names a page in the frame's rejection, e.g. `page 2`. */
  const renderDocument = (
    [first, ...rest]: readonly [Composition, ...Composition[]],
    options: SvgRenderOptions,
    subject: (index: number) => string
  ): SvgPagesResult => {
    const compositions = [first, ...rest];
    for (const composition of compositions) {
      enforceValidationMode(
        validate(composition),
        options.onValidationError ?? 'throw'
      );
    }
    const named = frameFor(options.frame);
    compositions.forEach((composition, index) => {
      assertBody(named, composition, subject(index));
    });
    const viewport = viewportFor(named.frame, compositions, options);
    const mode = options.theme ?? first.theme;
    const theme = named.frame.resolveTheme(mode);
    const page = (composition: Composition): StyledPage => ({
      composition,
      build: (context) =>
        named.frame.render(
          composition,
          { ...viewport, mode },
          frameDispatcherFor(context, theme, options.anchors)
        ),
    });
    const { elements, css } = withStyles(
      [page(first), ...rest.map(page)],
      schemeFor(mode)
    );
    return { ...viewport, pages: elements, css };
  };

  return {
    validating: true,
    render: (composition, options = {}) => {
      const { pages, ...viewport } = renderDocument(
        [composition],
        options,
        () => 'this composition'
      );
      return { ...viewport, element: pages[0] };
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
        (index) => `page ${index}`
      );
    },
    resolveViewport: (composition, options = {}) => {
      const { frame } = frameFor(options.frame);
      return viewportFor(frame, [composition], options);
    },
    renderNode: (node, options = {}) => {
      const { frame } = frameFor(options.frame);
      const composition: Composition = { type: 'view', body: [node] };
      const theme = frame.resolveTheme(options.theme);
      const { elements, css } = withStyles(
        [
          {
            composition,
            build: (context) =>
              frame.renderNode(
                node,
                frameDispatcherFor(context, theme, options.anchors)
              ),
          },
        ],
        schemeFor(options.theme)
      );
      return {
        width: frame.defaultWidth,
        height: frame.estimateHeight(composition, measuringOnly),
        element: elements[0],
        css,
      };
    },
  };
};
