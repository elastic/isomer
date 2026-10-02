/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  cloneElement,
  createElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';
import {
  type Composition,
  createChildNodeWalker,
  type EnhancementDefinition,
  type PrimitiveDispatcher,
  type PrimitiveNode,
  type PrimitiveRenderContext,
  type ReactContextArg,
  scopeScript,
} from '@elastic/isomer-sdk';
import {
  applyEnhancements,
  type CompositionWrapperOptions,
  renderCompositionContent,
  runEnhancementScript,
  wrapCompositionContent,
} from '@elastic/isomer-sdk/react';

import type { RuntimePackTypes } from '../pack_types';

export type { ReactContextArg };

/** Options for {@link ReactSurface.render} and, without `heading`, {@link ReactSurface.renderNode}. */
export type ReactRenderOptions<TRenderContext = PrimitiveRenderContext> = {
  /** Renders the leading `h2` / `p.sub`. Defaults to `true`. */
  heading?: boolean;
  /**
   * Wraps the content in the `.isomer[.framed][.fluid]` `section` the `html`
   * surface emits. `true` takes the defaults; an object sets `framed`,
   * `fluid`, `theme`, and `defaultAriaLabel`. Absent means bare content.
   */
  wrapper?: boolean | CompositionWrapperOptions;
  /**
   * Ids of the packs' enhancements to render with, as on the `html` surface:
   * those that apply reach every renderer as `context.enhancements`, turn node
   * anchors on when one asks, and run their `script` against the `wrapper`
   * section once it mounts. An id no pack registers is ignored. A new
   * composition or node object mounts a fresh section, so keep it stable
   * across re-renders. A `script` needs `wrapper`.
   */
  enhancements?: readonly string[];
} & (Record<string, never> extends TRenderContext
  ? { context?: TRenderContext }
  : { context: TRenderContext });

/** Options for {@link ReactSurface.renderNode}: a lone node has no heading to draw. */
export type ReactRenderNodeOptions<TRenderContext = PrimitiveRenderContext> =
  Omit<ReactRenderOptions<TRenderContext>, 'heading'>;

/**
 * The options argument, optional only when omitting it is sound: a pack that
 * narrows the render context with a required member makes it mandatory.
 */
export type ReactRenderArgs<
  TRenderContext,
  TOptions extends ReactRenderNodeOptions<TRenderContext> =
    ReactRenderOptions<TRenderContext>,
> =
  Record<string, never> extends TRenderContext
    ? [options?: TOptions]
    : [options: TOptions];

/**
 * Renders a composition or node to a React tree.
 *
 * The one non-validating surface, deliberately. React is the interactive
 * target, where a partial render beats a thrown error. It renders the value it
 * is given, reading it as it draws; a host that wants the other behaviour
 * calls `validate` itself and renders the result's `composition`.
 */
export interface ReactSurface<TRenderContext = PrimitiveRenderContext> {
  /** Always `false`: see the note above. */
  readonly validating: false;
  /** Renders a full composition to a React tree, bare unless `wrapper` is set. */
  render(
    composition: Composition,
    ...args: ReactRenderArgs<TRenderContext>
  ): ReactNode;
  /** Renders a single primitive node to a React tree; a lone node has no heading to draw. */
  renderNode(
    node: PrimitiveNode,
    ...args: ReactRenderArgs<
      TRenderContext,
      ReactRenderNodeOptions<TRenderContext>
    >
  ): ReactNode;
}

const useIsomorphicLayoutEffect =
  typeof document === 'undefined' ? useEffect : useLayoutEffect;

const keys = new WeakMap<object, Map<string, string>>();
let nextKey = 0;

/** One key per `source` object and script, so either changing mounts a fresh section rather than rerunning scripts on reused DOM. */
const scriptedKey = (source: object, js: string): string => {
  const bySource = keys.get(source) ?? new Map<string, string>();
  keys.set(source, bySource);
  const key = bySource.get(js) ?? String(nextKey++);
  bySource.set(js, key);
  return key;
};

/** Sections whose scripts have run, so StrictMode's second effect pass skips them. */
const ran = new WeakSet<Element>();

/** Sources already warned about a script with no `wrapper`, so a re-render does not repeat it. */
const warned = new WeakSet<object>();

/** `section` with `js` run against its element once it mounts. The remount key sits on `section`, leaving sibling identity to the host. */
const ScriptedSection = ({
  section,
  source,
  js,
}: {
  section: ReactElement;
  source: object;
  js: string;
}): ReactNode => {
  const ref = useRef<HTMLElement>(null);
  const key = scriptedKey(source, js);
  useIsomorphicLayoutEffect(() => {
    const root = ref.current;
    if (root && !ran.has(root)) {
      ran.add(root);
      runEnhancementScript(js, root);
    }
  }, [key]);
  return cloneElement(section, { key, ref });
};

/**
 * Creates the `react` {@link RuntimeSurfaces} entry.
 *
 * @param enhancementDefinitions What `enhancements` ids resolve against.
 * @param defaultAriaLabel The `wrapper` fallback when the composition has
 * neither `meta.ariaLabel` nor a `title`; a `wrapper` object may override it.
 */
export const createReactSurface = <TRenderContext = PrimitiveRenderContext>(
  dispatcher: PrimitiveDispatcher<
    PrimitiveNode,
    RuntimePackTypes<TRenderContext>
  >,
  enhancementDefinitions: readonly EnhancementDefinition[] = [],
  defaultAriaLabel = 'View'
): ReactSurface<TRenderContext> => {
  const walk = createChildNodeWalker(dispatcher.definitions);

  const renderWith = (
    composition: Composition,
    heading: boolean,
    options: ReactRenderNodeOptions<TRenderContext> | undefined,
    source: object = composition
  ): ReactNode => {
    const { wrapper, enhancements } = options ?? {};
    // `{}` only ever runs when `context` was optional, which
    // `ReactRenderOptions` allows exactly when `{}` is a complete context.
    const hostContext = options?.context ?? ({} as TRenderContext);
    const { context, applied } = enhancements
      ? applyEnhancements(
          hostContext,
          composition.body,
          walk,
          enhancementDefinitions,
          enhancements
        )
      : { context: hostContext, applied: [] };
    const js = applied
      .flatMap(({ script }) => (script ? [scopeScript(script)] : []))
      .join('\n');
    const content = renderCompositionContent(composition, dispatcher, context, {
      heading,
    });
    if (!wrapper) {
      if (js && !warned.has(source)) {
        warned.add(source);
        console.warn(
          'isomer: enhancement scripts run against the wrapper section; render with `wrapper` to run them'
        );
      }
      return content;
    }
    const section = wrapCompositionContent(content, composition, {
      defaultAriaLabel,
      ...(wrapper === true ? {} : wrapper),
    });
    return js
      ? createElement(ScriptedSection, { section, source, js })
      : section;
  };

  return {
    validating: false,
    render: (composition, ...[options]) =>
      renderWith(composition, options?.heading ?? true, options),
    renderNode: (node, ...[options]) =>
      renderWith({ type: 'view', body: [node] }, false, options, node),
  };
};
