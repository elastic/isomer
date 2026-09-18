/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, Fragment, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  type ChildNodeWalker,
  createChildNodeWalker,
} from '../../composition/body_node_base';
import type { Composition } from '../../composition/composition';
import type { RenderTheme } from '../../composition/named_color';
import type { ValidationError } from '../../composition/validation_error';
import type {
  AnyPrimitiveDefinition,
  PrimitiveNode,
  PrimitiveStyleCollectionContext,
  PrimitiveStyleCollector,
  StyledRenderContext,
  StyleHandle,
} from '../../define/primitive_module';
import {
  createCompositionValidator,
  enforceValidationMode,
  type ValidationErrorMode,
  type ValidationResult,
} from '../../validate/validation';
import { byteLength, type PayloadMeasurement } from '../payload';
import {
  type ReactContentDispatcher,
  renderCompositionContent,
  wrapCompositionContent,
} from '../react/content';

import type { EnhancementDefinition } from './enhancements';

/** Knobs for the HTML surface. Every field defaults, so `{}` is valid. */
export interface HTMLRenderOptions {
  /** Overrides {@link Composition.theme}. Defaults to `auto`. */
  theme?: RenderTheme;
  /** Collapses whitespace between tags, leaving `<pre>` content intact. Defaults to `true`. */
  minify?: boolean;
  /** Adds the `fluid` wrapper class and reaches the pack as {@link PrimitiveStyleCollectionContext.fluid}; the adapter decides what it changes. */
  fluid?: boolean;
  /** Adds the `framed` wrapper class the adapter styles as a frame. Defaults to `true`. */
  framed?: boolean;
  /**
   * Renders the composition's title and subtitle. Defaults to `true`. Set
   * `false` when the embedding host already shows the title itself — the title
   * still backs the wrapper's `aria-label`.
   */
  heading?: boolean;
  /** Whether the collected CSS is inlined as a `<style>` element. Defaults to `'inline'`. */
  css?: 'inline' | 'separate';
  /** Defaults to collecting into {@link HTMLRenderResult.validationErrors}; `'throw'` raises instead. */
  onValidationError?: ValidationErrorMode;
  /** Opt-in by {@link EnhancementDefinition.id}. One whose content gate does not match the body is dropped. */
  enhancements?: readonly string[];
  /** Opaque to the sdk; forwarded to {@link HTMLStyleAdapter} with the rest of the options. */
  adapterOptions?: Record<string, unknown>;
}

/**
 * One rendered HTML payload.
 *
 * `body` is the primitive markup alone; `html` adds the wrapper element and, on
 * the default `css: 'inline'`, a `<style>`. `css` is populated either way.
 * `validationErrors` are the messages that survived
 * {@link HTMLRenderOptions.onValidationError}.
 */
export interface HTMLRenderResult {
  html: string;
  css: string;
  body: string;
  measurement: PayloadMeasurement;
  validationErrors: ValidationError[];
}

/**
 * A pack's HTML entry point: the React renderer plus the style pass that runs
 * ahead of it.
 */
export interface HTMLRenderDispatcher<
  TNode extends PrimitiveNode,
  TCollector extends PrimitiveStyleCollector = PrimitiveStyleCollector,
  TContext = StyledRenderContext,
> extends ReactContentDispatcher<TNode, TContext> {
  /** The whole composition's inventory: a child walker built from one pack's definitions cannot descend into another pack's container. */
  readonly definitions: readonly AnyPrimitiveDefinition[];
  /** One node's style pass, driven by {@link HTMLStyleAdapter.collectViewStyles} rather than called by the sdk. */
  collectStyles(
    node: TNode,
    collector: TCollector,
    context: PrimitiveStyleCollectionContext
  ): void;
}

/**
 * The composition's child walker and the enhancements every loaded pack
 * declared. Threaded into the style adapter so content-gating can see a
 * table nested inside a container from another package.
 */
export interface HTMLEnhancementScope {
  walk: ChildNodeWalker;
  definitions: readonly EnhancementDefinition[];
}

/**
 * How a pack turns its nodes into CSS. Optional overall — without an adapter
 * the render still produces markup, just with no class names and an empty
 * `TContext`.
 */
export interface HTMLStyleAdapter<
  TNode extends PrimitiveNode = PrimitiveNode,
  TCollector extends PrimitiveStyleCollector = PrimitiveStyleCollector,
  TContext = StyledRenderContext,
> {
  /**
   * Names the collector shape {@link HTMLStyleAdapter.createCollector} returns, so a runtime can
   * reject a pack whose `collectStyles` hooks were written against a different one.
   */
  styleCollector?: string;
  /** One collector per render, shared by every other hook here and by both render passes. */
  createCollector(options: HTMLRenderOptions): TCollector;
  /**
   * Settles options that depend on the composition, before anything reads them.
   *
   * Needed by an adapter whose look is chosen per render: deciding `framed`
   * from the body has to happen before the wrapper class is written, not while
   * CSS is collected.
   */
  resolveOptions?(
    composition: Composition<TNode>,
    options: HTMLRenderOptions
  ): HTMLRenderOptions;
  /**
   * The `.isomer` / `.isomer.framed` / `.isomer.fluid` rules around a rendered composition.
   * Named for the wrapper rather than the frame, which the sdk reserves for a
   * pack's svg document surround.
   */
  collectWrapperStyles?(
    collector: TCollector,
    options: HTMLRenderOptions
  ): void;
  /** Walks the body into the collector, usually through {@link HTMLRenderDispatcher.collectStyles}. Runs before any markup exists. */
  collectViewStyles?(
    composition: Composition<TNode>,
    dispatcher: HTMLRenderDispatcher<TNode, TCollector, TContext>,
    collector: TCollector,
    context: PrimitiveStyleCollectionContext,
    options: HTMLRenderOptions,
    scope: HTMLEnhancementScope
  ): void;
  /** Runs once the collection pass has rendered the body, for styles only a renderer can discover. That markup is discarded. */
  collectAfterRender?(
    composition: Composition<TNode>,
    collector: TCollector,
    options: HTMLRenderOptions
  ): void;
  /**
   * Builds the render context handed to every `react` renderer. Called once
   * per pass, so an adapter that behaves differently while collecting returns
   * a different context then. Must be complete: the sdk does not fill fields
   * in, because `TContext` is the pack's own type.
   */
  createRenderContext(
    collector: TCollector,
    options: HTMLRenderOptions
  ): TContext;
  /** The collected CSS as text, with no `<style>` wrapper; the sdk adds one when `css` is `'inline'`. */
  renderStyles(collector: TCollector, options: HTMLRenderOptions): string;
  /**
   * Whether `handle` belongs to this adapter's stylesheet.
   *
   * Unused on a lone adapter. A runtime composing several packs' adapters
   * routes each handle to its owner, so CSS is neither duplicated nor
   * rendered against the wrong theme. An adapter that cannot answer this
   * cannot be combined with another.
   */
  ownsHandle?(handle: StyleHandle): boolean;
  /** Appended after {@link HTMLDispatcherRenderOptions.scriptText} into the single emitted `<script>`. */
  getScriptText?(
    composition: Composition<TNode>,
    options: HTMLRenderOptions,
    scope: HTMLEnhancementScope
  ): string;
}

/** What {@link renderHTMLWithDispatcher} needs beyond the composition. */
export interface HTMLDispatcherRenderOptions<
  TNode extends PrimitiveNode,
  TCollector extends PrimitiveStyleCollector = PrimitiveStyleCollector,
  TContext = StyledRenderContext,
> {
  dispatcher: HTMLRenderDispatcher<TNode, TCollector, TContext>;
  /** Runs once before rendering; {@link HTMLRenderOptions.onValidationError} decides what becomes of its errors. Defaults to `createCompositionValidator(dispatcher.definitions)`. */
  validate?: (composition: Composition<TNode>) => ValidationResult;
  options?: HTMLRenderOptions;
  /** Used only when the composition has neither `meta.ariaLabel` nor a `title`. Defaults to `'View'`. */
  defaultAriaLabel?: string;
  styleAdapter?: HTMLStyleAdapter<TNode, TCollector, TContext>;
  /** Emitted unescaped in the rendered `<script>`, ahead of {@link HTMLStyleAdapter.getScriptText}. */
  scriptText?: string;
  /**
   * Progressive enhancements declared by the packs this render was composed
   * from. The adapter content-gates them against the body via
   * {@link HTMLEnhancementScope.walk}.
   */
  enhancementDefinitions?: readonly EnhancementDefinition[];
}

/**
 * Renders a composition to standalone HTML: the wrapper element, the pack's
 * markup, and its CSS either inlined or returned separately.
 *
 * Runs the pack twice when a style adapter is present — once to collect
 * styles, once with the render context those styles produced — so a
 * `renderReact` implementation must be free of side effects.
 */
export const renderHTMLWithDispatcher = <
  TNode extends PrimitiveNode,
  TCollector extends PrimitiveStyleCollector = PrimitiveStyleCollector,
  TContext = StyledRenderContext,
>(
  composition: Composition<TNode>,
  {
    dispatcher,
    validate = createCompositionValidator(dispatcher.definitions),
    options: rawOptions = {},
    defaultAriaLabel = 'View',
    styleAdapter,
    scriptText = '',
    enhancementDefinitions = [],
  }: HTMLDispatcherRenderOptions<TNode, TCollector, TContext>
): HTMLRenderResult => {
  // Resolved before the validation mode is read, so an adapter can derive
  // `onValidationError`.
  const options =
    styleAdapter?.resolveOptions?.(composition, rawOptions) ?? rawOptions;
  const validation = validate(composition);
  enforceValidationMode(validation, options.onValidationError);
  const framed = options.framed ?? true;
  const heading = options.heading ?? true;
  const theme = options.theme ?? composition.theme ?? 'auto';
  const cssMode = options.css ?? 'inline';
  const styleState = styleAdapter?.createCollector(options);
  const enhancementScope: HTMLEnhancementScope = {
    walk: createChildNodeWalker(dispatcher.definitions),
    definitions: enhancementDefinitions,
  };

  if (styleState) {
    styleAdapter?.collectWrapperStyles?.(styleState, options);
    styleAdapter?.collectViewStyles?.(
      composition,
      dispatcher,
      styleState,
      { fluid: Boolean(options.fluid) },
      options,
      enhancementScope
    );
    const collectionContext = styleAdapter?.createRenderContext(
      styleState,
      options
    ) as TContext;
    renderToStaticMarkup(
      createElement(() =>
        renderCompositionContent(composition, dispatcher, collectionContext, {
          heading,
        })
      )
    );
    styleAdapter?.collectAfterRender?.(composition, styleState, options);
  }

  const renderContext: TContext =
    styleState && styleAdapter
      ? styleAdapter.createRenderContext(styleState, options)
      : // No adapter means no class names and no css vars to resolve.
        ({} as TContext);
  const cssText =
    styleState && styleAdapter
      ? styleAdapter.renderStyles(styleState, options)
      : '';
  const adapterScriptText =
    styleAdapter?.getScriptText?.(composition, options, enhancementScope) ?? '';
  const resolvedScriptText = [scriptText, adapterScriptText]
    .filter(Boolean)
    .join('\n');
  const body = renderToStaticMarkup(
    createElement(() =>
      renderCompositionContent(composition, dispatcher, renderContext, {
        heading,
      })
    )
  );
  const raw = renderToStaticMarkup(
    createElement(RenderedHtmlView<TNode>, {
      composition,
      theme,
      fluid: Boolean(options.fluid),
      framed,
      styleText: cssMode === 'inline' ? cssText : undefined,
      scriptText: resolvedScriptText || undefined,
      defaultAriaLabel,
      body,
    })
  );
  const html = options.minify === false ? raw : minifyHtml(raw);

  return {
    html,
    css: cssText,
    body,
    measurement: {
      html:
        byteLength(html) -
        (cssMode === 'inline' ? byteLength(cssText) : 0) -
        byteLength(resolvedScriptText),
      css: byteLength(cssText),
      js: byteLength(resolvedScriptText),
      total:
        byteLength(html) + (cssMode === 'inline' ? 0 : byteLength(cssText)),
    },
    validationErrors: validation.errors,
  };
};

interface RenderedHtmlViewProps<TNode extends PrimitiveNode> {
  composition: Composition<TNode>;
  theme: RenderTheme;
  fluid: boolean;
  framed: boolean;
  styleText?: string | undefined;
  scriptText?: string | undefined;
  defaultAriaLabel: string;
  body: string;
}

const RenderedHtmlView = <TNode extends PrimitiveNode>({
  composition,
  theme,
  fluid,
  framed,
  styleText,
  scriptText,
  defaultAriaLabel,
  body,
}: RenderedHtmlViewProps<TNode>): ReactNode =>
  wrapCompositionContent(
    createElement(
      Fragment,
      null,
      styleText
        ? createElement('style', {
            key: 'style',
            dangerouslySetInnerHTML: { __html: styleText },
          })
        : null,
      createElement('div', {
        key: 'body',
        dangerouslySetInnerHTML: { __html: body },
      }),
      scriptText
        ? createElement('script', {
            key: 'script',
            dangerouslySetInnerHTML: { __html: scriptText },
          })
        : null
    ),
    composition,
    { framed, fluid, theme, defaultAriaLabel }
  );

// `<pre>` content is whitespace-significant, so those blocks are left untouched
// and only the markup around them is collapsed.
const PRE_BLOCK = /<pre[\s>][\s\S]*?<\/pre>/g;

// Only whitespace spanning a line break is collapsed: a single space between
// inline elements (`<b>a</b> <i>b</i>`) is authored content.
const TAG_GAP_WITH_NEWLINE = />\s*\n\s*</g;

const minifyHtml = (value: string): string => {
  let result = '';
  let cursor = 0;
  for (const match of value.matchAll(PRE_BLOCK)) {
    const start = match.index;
    result += value.slice(cursor, start).replace(TAG_GAP_WITH_NEWLINE, '><');
    result += match[0];
    cursor = start + match[0].length;
  }
  result += value.slice(cursor).replace(TAG_GAP_WITH_NEWLINE, '><');
  return result.trim();
};
