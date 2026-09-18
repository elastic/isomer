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
}

/**
 * Options for {@link SvgSurface.renderNode}.
 *
 * Geometry is absent deliberately: one node is drawn with no surround, so there
 * is nothing for a width or a height to size.
 */
export type SvgRenderNodeOptions = Pick<SvgRenderOptions, 'frame' | 'theme'>;

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

/**
 * Renders a composition or node to an image backend's input: the same React
 * tree the DOM gets, paired with the pack's stylesheet.
 *
 * `svg` is a render surface; projecting it to SVG or PNG is a separate
 * capability a host opts into.
 */
export interface SvgSurface {
  /** Always `true`: this surface validates the composition before rendering. */
  readonly validating: true;
  /** Renders a full composition inside the chosen frame. */
  render(composition: Composition, options?: SvgRenderOptions): SvgRenderResult;
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
  const assertBody = (
    { name, frame }: NamedFrame,
    composition: Composition
  ): void => {
    const errors = frame.validateBody(composition.body);
    if (errors.length > 0) {
      throw new IsomerError(
        'INVALID_FRAME_BODY',
        `runtime: frame "${name}" cannot draw this composition: ${errors.join('; ')}`
      );
    }
  };

  /** For `estimateHeight`, which measures nodes rather than drawing them. */
  const measuringOnly: FrameDispatcher = {
    renderSvg: () => null,
    estimateSvgHeight: (node) => dispatcher.estimateSvgHeight(node),
  };

  const viewportFor = (
    frame: BoundFrame,
    composition: Composition,
    options: Pick<SvgRenderOptions, 'width' | 'height'>
  ): { width: number; height: number } => ({
    width: options.width ?? frame.defaultWidth,
    height: options.height ?? frame.estimateHeight(composition, measuringOnly),
  });

  const frameDispatcherFor = (
    context: TRenderContext,
    theme: unknown
  ): FrameDispatcher => ({
    renderSvg: (node, key) => dispatcher.renderSvg(node, context, theme, key),
    estimateSvgHeight: (node) => dispatcher.estimateSvgHeight(node),
  });

  /**
   * Runs the pack twice, in the same hook order as the SDK's HTML envelope:
   * class names are collected as a side effect of rendering, so the stylesheet
   * only exists once a pass has resolved them. `react` renderers must therefore
   * be side-effect free.
   */
  const withStyles = (
    build: (context: TRenderContext) => ReactNode,
    composition: Composition,
    scheme: 'light' | 'dark'
  ): { element: ReactNode; css: string } => {
    if (!styleAdapter) {
      return { element: build({} as TRenderContext), css: '' };
    }
    const requested: HTMLRenderOptions = {
      theme: scheme,
      adapterOptions: { [flattenSchemeOption]: scheme },
    };
    const options =
      styleAdapter.resolveOptions?.(composition, requested) ?? requested;
    const collector = styleAdapter.createCollector(options);
    styleAdapter.collectWrapperStyles?.(collector, options);
    styleAdapter.collectViewStyles?.(
      composition,
      dispatcher,
      collector,
      { fluid: Boolean(options.fluid) },
      options,
      {
        walk: createChildNodeWalker(dispatcher.definitions),
        definitions: [],
      }
    );
    renderToStaticMarkup(
      createElement(
        Fragment,
        null,
        build(styleAdapter.createRenderContext(collector, options))
      )
    );
    styleAdapter.collectAfterRender?.(composition, collector, options);
    return {
      element: build(styleAdapter.createRenderContext(collector, options)),
      css: styleAdapter.renderStyles(collector, options),
    };
  };

  return {
    validating: true,
    render: (composition, options = {}) => {
      enforceValidationMode(
        validate(composition),
        options.onValidationError ?? 'throw'
      );
      const named = frameFor(options.frame);
      assertBody(named, composition);
      const viewport = viewportFor(named.frame, composition, options);
      const mode = options.theme ?? composition.theme;
      const theme = named.frame.resolveTheme(mode);
      return {
        ...viewport,
        ...withStyles(
          (context) =>
            named.frame.render(
              composition,
              { ...viewport, mode },
              frameDispatcherFor(context, theme)
            ),
          composition,
          schemeFor(mode)
        ),
      };
    },
    resolveViewport: (composition, options = {}) => {
      const { frame } = frameFor(options.frame);
      return viewportFor(frame, composition, options);
    },
    renderNode: (node, options = {}) => {
      const { frame } = frameFor(options.frame);
      const composition: Composition = { type: 'view', body: [node] };
      const theme = frame.resolveTheme(options.theme);
      return {
        width: frame.defaultWidth,
        height: frame.estimateHeight(composition, measuringOnly),
        ...withStyles(
          (context) =>
            frame.renderNode(node, frameDispatcherFor(context, theme)),
          composition,
          schemeFor(options.theme)
        ),
      };
    },
  };
};
