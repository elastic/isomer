/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AnyPrimitiveDefinition,
  type AnyPrimitivePack,
  bindFrame,
  type BoundFrame,
  type CheckedValidationResult,
  composePacks,
  type Composition,
  createCompositionParser,
  createCompositionValidator,
  createPrimitiveDispatcher,
  describeCapabilities,
  type Frame,
  getCompositionSchemaForDefinitions,
  type InputBudget,
  IsomerError,
  type ParsedComposition,
  type PrimitiveNode,
  type PrimitivePack,
  type PrimitiveRenderContext,
  type PrimitiveStyleCollector,
} from '@elastic/isomer-sdk';
import type { ZodObject } from 'zod';

import type { RuntimePackTypes } from '../pack_types';
import {
  createViewRegistry,
  type RegisteredView,
  type ViewRegistry,
} from '../registry';
import {
  createHtmlSurface,
  createMarkdownSurface,
  createReactSurface,
  createSlackSurface,
  createSnapshotSurface,
  createTextSurface,
  type HTMLStyleAdapter,
  type HtmlSurface,
  type MarkdownSurface,
  type ReactSurface,
  type SlackSurface,
  type SnapshotSurface,
  type TextSurface,
} from '../surfaces';

import {
  createRuntimeAuthoringContextFactory,
  type HostCapabilities,
  type RuntimeAuthoringContext,
  type RuntimeAuthoringOptions,
} from './authoring';
import {
  applyRendererOverrides,
  type RuntimeRendererOverrides,
} from './overrides';
import { resolveStyleAdapter } from './style_adapter';

/** The frames a runtime can draw with, keyed by the name a render asks for. */
export type FrameMap<TTheme> = Readonly<Record<string, Frame<TTheme>>>;

/**
 * Options for {@link createIsomerRuntime}.
 *
 * `THostContext` is what the host passes to `viewRegistry.request` and a view's
 * `build` receives. `TRenderContext` is what a pack's `react` renderers
 * receive. `TTheme` is the palette every pack and frame agree on.
 */
export interface IsomerRuntimeOptions<
  THostContext = unknown,
  TRenderContext = PrimitiveRenderContext,
  TTheme = never,
> {
  /**
   * Primitive packs this runtime dispatches, validates, and renders.
   *
   * Purely additive: a pack is a vocabulary, so composing two of them composes
   * their node types and nothing else. What a composition is framed as comes
   * from {@link IsomerRuntimeOptions.frames} instead.
   */
  packs: readonly PrimitivePack<TTheme>[];
  /**
   * The documents the `snapshot` surface can draw, keyed by the name a render asks
   * for. Omit it and `surfaces.snapshot` is `undefined`. `TTheme` is inferred from
   * `packs` first, so a palette mismatch is reported against this field.
   */
  frames?: FrameMap<TTheme>;
  /** Frame used when a render names none; defaults to the sole entry. */
  defaultFrame?: string;
  /**
   * Formats the host ships beyond the runtime's own, reported by
   * `getCapabilities`: a rasterizer's, e.g. a takumi backend's `formats`.
   */
  formats?: readonly string[];
  /** Views to pre-register on the runtime's view registry. */
  views?: readonly RegisteredView<THostContext, unknown, PrimitiveNode>[];
  /** Per-primitive-type renderer replacements. */
  rendererOverrides?: RuntimeRendererOverrides;
  /**
   * The HTML surface's CSS and class-name strategy.
   *
   * Defaults to the packs' own adapters, combined — a host loading two styled
   * packs gets both stylesheets without having to know how either one works.
   * Pass this to replace that default for every pack at once, or to supply a
   * no-op when a CSS-bearing pack should emit no CSS.
   *
   * Required when any pack declares `collectStyles` and no pack (or this
   * option) supplies an adapter.
   */
  styleAdapter?: HTMLStyleAdapter<
    PrimitiveNode,
    PrimitiveStyleCollector,
    TRenderContext
  >;
  /**
   * Fallback `aria-label` for the `html` wrapper, and the `react` one when
   * `wrapper` is set, when the composition has neither `meta.ariaLabel` nor a
   * `title`. Defaults to `'View'`.
   */
  defaultAriaLabel?: string;
  /** Options for the authoring schema and declarations `getAuthoringContext` returns. */
  authoring?: RuntimeAuthoringOptions;
  /**
   * Limits `checkInputBudget` applies in `parse`, `validate`, view input, and
   * every surface but `react`, which does not validate. Defaults to the SDK's.
   */
  inputBudget?: InputBudget;
}

/**
 * One namespace per output format; each exposes `render` and `renderNode`
 * uniformly. `TSnapshot` is `SnapshotSurface` when the runtime was built with `frames`
 * and `undefined` when it was not; a runtime whose options are not statically
 * known carries the union. Every key but `html` is a `SurfaceName`; `html`
 * wraps the `react` output in a document and no node targets it.
 */
export interface RuntimeSurfaces<
  TRenderContext = PrimitiveRenderContext,
  TSnapshot extends SnapshotSurface | undefined = SnapshotSurface | undefined,
> {
  react: ReactSurface<TRenderContext>;
  html: HtmlSurface;
  text: TextSurface;
  markdown: MarkdownSurface;
  slack: SlackSurface;
  /** A fixed-size render inside a frame, or `undefined` when the host supplied no frame. */
  snapshot: TSnapshot;
}

/**
 * What {@link createIsomerRuntime} returns: the composed packs, one validator
 * and parser over their inventory, a view registry, one render surface per
 * format, and the authoring material an agent is handed.
 */
export interface IsomerRuntime<
  THostContext = unknown,
  TRenderContext = PrimitiveRenderContext,
  TTheme = never,
  TSnapshot extends SnapshotSurface | undefined = SnapshotSurface | undefined,
> {
  /**
   * The packs this runtime was built from, with renderer overrides applied.
   * `TTheme` defaults to `never` so a bare `IsomerRuntime` annotation accepts
   * a runtime built around any palette.
   */
  readonly packs: readonly PrimitivePack<TTheme>[];
  /** Every pack's definitions, flattened — the dispatcher's inventory. */
  readonly primitives: readonly AnyPrimitiveDefinition[];
  /** Product-owned views, requested by id; the `views` option pre-registers. */
  readonly viewRegistry: ViewRegistry<THostContext, PrimitiveNode>;
  /** One render surface per output format; `snapshot` is `undefined` without `frames`. */
  readonly surfaces: RuntimeSurfaces<TRenderContext, TSnapshot>;
  /** Builds fresh authoring material (schema, declarations, catalog, views) for this runtime. */
  getAuthoringContext(): RuntimeAuthoringContext;
  /** Reports the primitive types, surfaces, and formats this runtime supports. */
  getCapabilities(): HostCapabilities;
  /**
   * Validates a composition against this runtime's primitives: the input
   * budget, the schema, then the semantic passes. `composition` on the result
   * is the plain copy it checked, which every validating surface renders.
   */
  validate(composition: Composition): CheckedValidationResult;
  /**
   * Parses an unknown value as a `Composition`: the input budget and the
   * schema, not the semantic passes `validate` runs.
   */
  parse(value: unknown): ParsedComposition;
  /**
   * This runtime's `Composition` schema — the same instance `validate`/`parse`
   * use internally, memoized per definitions-array identity.
   */
  getCompositionSchema(): ZodObject;
}

/**
 * Builds an {@link IsomerRuntime} from primitive packs: a dispatcher,
 * composition validator/parser, view registry, and one render surface per
 * format. Passing `frames` is what makes `surfaces.snapshot` present, and the
 * signature says so: with `frames` it is `SnapshotSurface`, without it is
 * `undefined`, and a call whose options are not a literal gets the union.
 */
export interface CreateIsomerRuntime {
  <
    THostContext = unknown,
    TRenderContext = PrimitiveRenderContext,
    TTheme = never,
  >(
    options: IsomerRuntimeOptions<THostContext, TRenderContext, TTheme> & {
      frames: FrameMap<TTheme>;
    }
  ): IsomerRuntime<THostContext, TRenderContext, TTheme, SnapshotSurface>;
  <
    THostContext = unknown,
    TRenderContext = PrimitiveRenderContext,
    TTheme = never,
  >(
    options: IsomerRuntimeOptions<THostContext, TRenderContext, TTheme> & {
      frames?: undefined;
    }
  ): IsomerRuntime<THostContext, TRenderContext, TTheme, undefined>;
  <
    THostContext = unknown,
    TRenderContext = PrimitiveRenderContext,
    TTheme = never,
  >(
    options: IsomerRuntimeOptions<THostContext, TRenderContext, TTheme>
  ): IsomerRuntime<THostContext, TRenderContext, TTheme>;
}

// One implementation serves every overload; the cast is what lets the
// `frames` overload promise a present `snapshot`.
export const createIsomerRuntime: CreateIsomerRuntime = (<
  THostContext,
  TRenderContext,
  TTheme,
>(
  options: IsomerRuntimeOptions<THostContext, TRenderContext, TTheme>
): IsomerRuntime<THostContext, TRenderContext, TTheme> => {
  const styleAdapter = resolveStyleAdapter(options.packs, options.styleAdapter);
  assertRuntimePacks(options.packs, styleAdapter);
  const frames = bindFrames(options.frames);
  const defaultFrame = resolveDefaultFrame(
    options.frames && frames,
    options.defaultFrame
  );
  const packs = applyRendererOverrides(
    options.packs,
    options.rendererOverrides
  );
  const { definitions, enhancements, slackAssetTypes } = composePacks(packs);
  const dispatcher = createPrimitiveDispatcher<
    PrimitiveNode,
    RuntimePackTypes<TRenderContext>
  >(definitions, {
    label: 'runtime',
    isSlackAssetType: (type) => slackAssetTypes.has(type),
  });
  const { inputBudget } = options;
  const budget = inputBudget === undefined ? {} : { inputBudget };
  const validate = createCompositionValidator(definitions, budget);
  const parse = createCompositionParser(definitions, budget);
  const viewRegistry = createViewRegistry<THostContext, PrimitiveNode>(
    validate,
    budget
  );
  options.views?.forEach(viewRegistry.register);
  const getAuthoringContext = createRuntimeAuthoringContextFactory(
    definitions,
    viewRegistry.list,
    packs,
    options.authoring
  );
  const defaultAriaLabel = options.defaultAriaLabel ?? 'View';
  const surfaces: RuntimeSurfaces<TRenderContext> = {
    react: createReactSurface(dispatcher, enhancements, defaultAriaLabel),
    html: createHtmlSurface(
      dispatcher,
      validate,
      styleAdapter,
      enhancements,
      defaultAriaLabel
    ),
    text: createTextSurface(dispatcher, validate),
    markdown: createMarkdownSurface(dispatcher, validate),
    slack: createSlackSurface(dispatcher, validate),
    snapshot:
      defaultFrame === undefined
        ? undefined
        : createSnapshotSurface(
            dispatcher,
            validate,
            (name) => {
              const resolved = name ?? defaultFrame;
              const frame = frameAt(frames, resolved);
              if (frame === undefined) {
                const registered = Object.keys(frames)
                  .map((frameName) => `"${frameName}"`)
                  .join(', ');
                throw new IsomerError(
                  'UNKNOWN_FRAME',
                  `runtime: no frame named "${resolved}" (have ${registered})`
                );
              }
              return { name: resolved, frame };
            },
            styleAdapter
          ),
  };
  const sources = {
    surfaces: Object.entries(surfaces)
      .filter(([, surface]) => surface !== undefined)
      .map(([name]) => name),
    formats: options.formats ?? [],
  };

  return {
    packs,
    primitives: definitions,
    viewRegistry,
    surfaces,
    getAuthoringContext,
    getCapabilities: () => describeCapabilities(packs, sources),
    validate,
    parse,
    getCompositionSchema: () => getCompositionSchemaForDefinitions(definitions),
  };
}) as CreateIsomerRuntime;

/**
 * The runtime-level rules `composePacks` does not own: a runtime needs at
 * least one pack, and a CSS-bearing pack needs an adapter from somewhere.
 */
const assertRuntimePacks = (
  packs: readonly AnyPrimitivePack[],
  styleAdapter: unknown
): void => {
  if (packs.length === 0) {
    throw new IsomerError(
      'EMPTY_PACKS',
      'runtime: at least one primitive pack is required'
    );
  }
  if (styleAdapter !== undefined) {
    return;
  }
  for (const pack of packs) {
    const collecting = pack.primitives.find(
      (definition) => definition.collectStyles !== undefined
    );
    if (collecting) {
      throw new IsomerError(
        'MISSING_STYLE_ADAPTER',
        `runtime: pack "${pack.id}" primitive "${collecting.type}" declares collectStyles but no styleAdapter was supplied`
      );
    }
  }
};

const bindFrames = <TTheme>(
  frames: FrameMap<TTheme> | undefined
): Readonly<Record<string, BoundFrame>> =>
  Object.fromEntries(
    Object.entries(frames ?? {}).map(([name, value]) => [
      name,
      bindFrame(value),
    ])
  );

/**
 * Own-property lookup: `frames` is caller-supplied, so a truthiness check would
 * treat `'constructor'` as a frame and fail later as an unrelated `TypeError`.
 */
const frameAt = (
  frames: Readonly<Record<string, BoundFrame>>,
  name: string
): BoundFrame | undefined =>
  Object.hasOwn(frames, name) ? frames[name] : undefined;

/**
 * Picks the frame a render uses when it names none.
 *
 * Defaulted rather than required for the one-frame case. Returns `undefined`
 * only when `frames` was omitted, which is what leaves the `snapshot` surface off;
 * an empty map throws, since the overloads type it as present.
 */
const resolveDefaultFrame = (
  frames: Readonly<Record<string, BoundFrame>> | undefined,
  requested: string | undefined
): string | undefined => {
  if (frames === undefined) {
    if (requested !== undefined) {
      throw new IsomerError(
        'UNKNOWN_FRAME',
        `runtime: defaultFrame "${requested}" was given but no frames were supplied`
      );
    }
    return undefined;
  }
  const names = Object.keys(frames);
  if (names.length === 0) {
    throw new IsomerError(
      'EMPTY_FRAMES',
      'runtime: frames is empty; omit it to build a runtime without the snapshot surface'
    );
  }
  if (requested !== undefined) {
    if (frameAt(frames, requested) === undefined) {
      throw new IsomerError(
        'UNKNOWN_FRAME',
        `runtime: defaultFrame "${requested}" is not one of the supplied frames (${names
          .map((name) => `"${name}"`)
          .join(', ')})`
      );
    }
    return requested;
  }
  if (names.length > 1) {
    throw new IsomerError(
      'AMBIGUOUS_FRAME',
      `runtime: ${names.length} frames supplied (${names
        .map((name) => `"${name}"`)
        .join(', ')}), so defaultFrame is required`
    );
  }
  return names[0];
};
