/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, Fragment, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  type Comment as JavaScriptComment,
  type Node as JavaScriptNode,
  parse,
} from 'acorn';

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
  EMBEDDED_SCRIPT_ATTRIBUTE,
  resolveEnhancements,
  scopeScript,
} from '../../pack/enhancements';
import {
  type CheckedValidationResult,
  compositionToRender,
  createCompositionValidator,
  enforceValidationMode,
  type ValidationErrorMode,
} from '../../validate/validation';
import { withAnchors } from '../anchors';
import { contextWith } from '../context_view';
import { byteLength, type PayloadMeasurement } from '../payload';
import {
  type ReactContentDispatcher,
  renderCompositionContent,
  wrapCompositionContent,
} from '../react/content';

import {
  embedScript,
  type EnhancementDefinition,
  enhancementScript,
} from './enhancements';

/** Knobs for the HTML surface. Every field defaults, so `{}` is valid. */
export interface HTMLRenderOptions {
  /** Overrides {@link Composition.theme}; `auto` when neither is set. */
  theme?: RenderTheme;
  /** Drops whitespace between tags that spans a line break, leaving `<pre>`, `<script>`, `<style>`, and `<textarea>` content intact. Defaults to `true`. */
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
  /**
   * Who runs the enhancement script. Defaults to `'embedded'`: `html` carries
   * a `<script>` that finds its own `.isomer` section when the page parses it.
   *
   * `'embedded'` never runs inside a shadow root, or anywhere the host inserts
   * `html` itself (`innerHTML`, a React tree). Use `'host'` there: `html`
   * carries no `<script>`, and the host calls `runEnhancementScript(js,
   * section)` after inserting it.
   */
  scripts?: 'embedded' | 'host';
  /** Defaults to collecting into {@link HTMLRenderResult.validationErrors}; `'throw'` raises instead. Input the budget refused raises in either mode. */
  onValidationError?: ValidationErrorMode;
  /** Opt-in by {@link EnhancementDefinition.id}. One whose content gate does not match the body is dropped. */
  enhancements?: readonly string[];
  /** `true` renders node anchors whether or not an enhancement asks for them, e.g. for tests. `false` cannot turn off anchors an enhancement needs. */
  anchors?: boolean;
  /**
   * Resolves `light-dark(…)` in the stylesheet to one scheme's value. A browser
   * resolves it itself; an image is one static frame, so the `svg` surface sets
   * it.
   */
  scheme?: 'light' | 'dark';
}

/**
 * One rendered HTML payload.
 *
 * `body` is the primitive markup alone; `html` adds the wrapper element, on
 * the default `css: 'inline'` a `<style>`, and on the default
 * `scripts: 'embedded'` a `<script>`. `css` and `js` are populated either way.
 * `validationErrors` are the messages that survived
 * {@link HTMLRenderOptions.onValidationError}.
 */
export interface HTMLRenderResult {
  html: string;
  css: string;
  /**
   * The enhancement script as a function body over `root`, or `''`. Under
   * `scripts: 'embedded'` the `<script>` in `html` wraps the same body; under
   * `'host'` the host runs it with `runEnhancementScript`. It is never a
   * complete script on its own.
   */
  js: string;
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
   * a different context then. Must be complete, because `TContext` is the
   * pack's own type. The sdk never writes to it: whether renderers anchor
   * is the surface's decision, whatever the context's `anchors` says.
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
  /**
   * Appended after {@link HTMLDispatcherRenderOptions.scriptText} into the
   * render's one script. A function body with `root` in scope, under the same
   * rules as {@link EnhancementDefinition.script}.
   */
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
  /** Runs once before rendering, which draws the composition it returns; {@link HTMLRenderOptions.onValidationError} decides what becomes of its errors. Defaults to `createCompositionValidator(dispatcher.definitions)`. */
  validate?: (
    composition: Composition<TNode>
  ) => CheckedValidationResult<TNode>;
  options?: HTMLRenderOptions;
  /** Used only when the composition has neither `meta.ariaLabel` nor a `title`. Defaults to `'View'`. */
  defaultAriaLabel?: string;
  styleAdapter?: HTMLStyleAdapter<TNode, TCollector, TContext>;
  /**
   * Emitted unescaped ahead of {@link HTMLStyleAdapter.getScriptText}. A
   * function body with `root` in scope, under the same rules as
   * {@link EnhancementDefinition.script}.
   */
  scriptText?: string;
  /**
   * Progressive enhancements declared by the packs this render was composed
   * from. The render resolves {@link HTMLRenderOptions.enhancements} against
   * them once, hands every renderer the set as `context.enhancements`, and
   * emits each resolved one's script.
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
  input: Composition<TNode>,
  {
    dispatcher,
    validate = createCompositionValidator<TNode>(dispatcher.definitions),
    options: rawOptions = {},
    defaultAriaLabel = 'View',
    styleAdapter,
    scriptText = '',
    enhancementDefinitions = [],
  }: HTMLDispatcherRenderOptions<TNode, TCollector, TContext>
): HTMLRenderResult => {
  const validation = validate(input);
  const composition = compositionToRender(validation);
  // Resolved before the validation mode is read, so an adapter can derive
  // `onValidationError`.
  const options =
    styleAdapter?.resolveOptions?.(composition, rawOptions) ?? rawOptions;
  enforceValidationMode(validation, options.onValidationError);
  const framed = options.framed ?? true;
  const heading = options.heading ?? true;
  const theme = options.theme ?? composition.theme ?? 'auto';
  const cssMode = options.css ?? 'inline';
  const scriptsMode = options.scripts ?? 'embedded';
  const styleState = styleAdapter?.createCollector(options);
  const enhancementScope: HTMLEnhancementScope = {
    walk: createChildNodeWalker(dispatcher.definitions),
    definitions: enhancementDefinitions,
  };
  const applied = resolveEnhancements(
    composition.body,
    enhancementScope.walk,
    enhancementDefinitions,
    options.enhancements ?? []
  );
  const enhancements: ReadonlySet<string> = new Set(
    applied.map(({ id }) => id)
  );
  const anchors =
    options.anchors === true || applied.some(({ anchors }) => anchors);
  const enhanced = (context: TContext): TContext =>
    contextWith(context, 'enhancements', enhancements);

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
    const collectionContext = enhanced(
      styleAdapter?.createRenderContext(styleState, options) as TContext
    );
    withAnchors(anchors, () =>
      renderToStaticMarkup(
        createElement(() =>
          renderCompositionContent(composition, dispatcher, collectionContext, {
            heading,
          })
        )
      )
    );
    styleAdapter?.collectAfterRender?.(composition, styleState, options);
  }

  const renderContext = enhanced(
    styleState && styleAdapter
      ? styleAdapter.createRenderContext(styleState, options)
      : // No adapter means no class names and no css vars to resolve.
        ({} as TContext)
  );
  const cssText =
    styleState && styleAdapter
      ? styleAdapter.renderStyles(styleState, options)
      : '';
  const adapterScriptText =
    styleAdapter?.getScriptText?.(composition, options, enhancementScope) ?? '';
  const js = [
    ...[scriptText, adapterScriptText].filter(Boolean).map(scopeScript),
    enhancementScript(applied),
  ]
    .filter(Boolean)
    .join('\n');
  const embeddedScript =
    js && scriptsMode === 'embedded' ? embedScript(js) : '';
  const body = withAnchors(anchors, () =>
    renderToStaticMarkup(
      createElement(() =>
        renderCompositionContent(composition, dispatcher, renderContext, {
          heading,
        })
      )
    )
  );
  const inlineCss = cssMode === 'inline' ? embedCss(cssText) : '';
  const inlineJs = embeddedScript ? embedJs(embeddedScript) : '';
  const raw = renderToStaticMarkup(
    createElement(RenderedHtmlView<TNode>, {
      composition,
      theme,
      fluid: Boolean(options.fluid),
      framed,
      styleText: inlineCss || undefined,
      scriptText: inlineJs || undefined,
      defaultAriaLabel,
      body,
    })
  );
  const html = options.minify === false ? raw : minifyHtml(raw);

  // Inline payloads are measured as emitted, escapes included.
  const inlineCssBytes = byteLength(inlineCss);
  const inlineJsBytes = byteLength(inlineJs);
  const separateCssBytes = cssMode === 'inline' ? 0 : byteLength(cssText);
  const separateJsBytes = embeddedScript ? 0 : byteLength(js);

  return {
    html,
    css: cssText,
    js,
    body,
    measurement: {
      html: byteLength(html) - inlineCssBytes - inlineJsBytes,
      css: inlineCssBytes + separateCssBytes,
      js: inlineJsBytes + separateJsBytes,
      total: byteLength(html) + separateCssBytes + separateJsBytes,
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

// Only `</style` ends a `<style>`. `\/` is a CSS escape for `/`, so a string
// holding it keeps its value.
const embedCss = (css: string): string => css.replace(/<\/(?=style)/gi, '<\\/');

interface ScriptNode extends JavaScriptNode {
  tag: ScriptNode;
  quasi: ScriptNode;
  quasis: ScriptNode[];
  expressions: ScriptNode[];
  value: { raw: string; cooked: string | null };
  name?: string;
}

// Tagged templates observe raw spelling and reuse the same frozen object per site.
const embedJs = (js: string): string => {
  if (!/<\/script|<!--/i.test(js)) return js;
  const comments: JavaScriptComment[] = [];
  const tree = parse(js, { ecmaVersion: 'latest', onComment: comments });
  const sites: ScriptNode[] = [];
  const identifiers = new Set<string>();
  const pending: JavaScriptNode[] = [tree];
  while (pending.length) {
    const node = pending.pop()! as ScriptNode;
    if (node.type === 'Identifier' && node.name) identifiers.add(node.name);
    if (
      node.type === 'TaggedTemplateExpression' &&
      node.quasi.quasis.some(({ value: { raw } }) =>
        /<\/script|<!--/i.test(raw)
      )
    )
      sites.push(node);
    for (const value of Object.values(node)) {
      for (const child of Array.isArray(value) ? value : [value]) {
        if (
          child &&
          typeof child === 'object' &&
          'type' in child &&
          'start' in child
        ) {
          pending.push(child as JavaScriptNode);
        }
      }
    }
  }
  sites.sort((a, b) => a.start - b.start);
  let prefix = '__isomerTemplate';
  while ([...identifiers].some((name) => name.startsWith(prefix)))
    prefix += '_';
  const literal = (value: string | null): string =>
    value === null ? 'void 0' : JSON.stringify(value).replace(/</g, '\\u003c');
  const rewrite = (start: number, end: number): string => {
    let cursor = start;
    let result = '';
    const edits = [
      ...sites.map((site, index) => ({
        ...site,
        index,
        comment: undefined as string | undefined,
      })),
      ...comments
        .filter(({ start }) => /^(?:<!--|-->)/.test(js.slice(start, start + 4)))
        .map((comment) => ({ ...comment, index: -1, comment: comment.value })),
    ].sort((a, b) => a.start - b.start);
    for (const edit of edits) {
      if (edit.start < cursor || edit.end > end) continue;
      result += js.slice(cursor, edit.start);
      if (edit.comment !== undefined) {
        result += `//${edit.comment}`;
      } else {
        const site = sites[edit.index]!;
        const {
          tag,
          quasi: { quasis, expressions },
        } = site;
        const cooked = quasis
          .map(({ value }) => literal(value.cooked))
          .join(',');
        const raw = quasis.map(({ value }) => literal(value.raw)).join(',');
        const cache = `${prefix}${edit.index}`;
        const template = `${cache} ??= ${prefix}Freeze(${prefix}Define([${cooked}], 'raw', {value:${prefix}Freeze([${raw}])}))`;
        const args = expressions.map((expression) =>
          rewrite(expression.start, expression.end)
        );
        result += `(${rewrite(tag.start, tag.end)})(${template}${args.map((arg) => `,(${arg})`).join('')})`;
      }
      cursor = edit.end;
    }
    return result + js.slice(cursor, end);
  };
  const rewritten = rewrite(0, js.length);
  const scoped = sites.length
    ? `(function(){const ${prefix}Freeze=Object.freeze,${prefix}Define=Object.defineProperty;let ${sites.map((_site, index) => `${prefix}${index}`).join(',')};\n${rewritten}\n})();`
    : rewritten;
  return scoped
    .replace(/<\/(?=script)/gi, '<\\/')
    .replace(/<!--/g, (_match, at: number, source: string) =>
      escapedBy(source, at) ? 'x3C!--' : '\\x3C!--'
    );
};

const escapedBy = (source: string, at: number): boolean => {
  let slashes = 0;
  while (source[at - slashes - 1] === '\\') slashes += 1;
  return slashes % 2 === 1;
};

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
            [EMBEDDED_SCRIPT_ATTRIBUTE]: '',
            dangerouslySetInnerHTML: { __html: scriptText },
          })
        : null
    ),
    composition,
    { framed, fluid, theme, defaultAriaLabel }
  );

// Whitespace inside `pre`, `script`, `style`, and `textarea` is content, so
// those elements match whole and pass through. Elsewhere only whitespace
// spanning a line break is collapsed: a single space between inline elements
// (`<b>a</b> <i>b</i>`) is authored content.
const MINIFY_RE =
  /<(pre|script|style|textarea)[\s>][\s\S]*?(?:<\/\1\s*>|$)|(?<=>)\s+(?=<)/gi;

const minifyHtml = (value: string): string =>
  value
    .replace(MINIFY_RE, (match, element: string | undefined) =>
      element || !match.includes('\n') ? match : ''
    )
    .trim();
