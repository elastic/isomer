/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Composition,
  PrimitiveCatalogEntry,
  PrimitiveGroup,
  PrimitiveNode,
  RenderTheme,
  ValidationError,
} from '@elastic/isomer-sdk';
import type {
  AuthoringProfileId,
  AuthoringViewSummary,
} from '@elastic/isomer-sdk/author';
import type { output, ZodObject } from 'zod';

/** One block of a tool's answer. */
export type IsomerToolContent =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: 'image/png' };

/** A tool's answer, shaped like an MCP `CallToolResult` without depending on one. `isError` marks a call the model cannot use as-is. */
export interface IsomerToolResult {
  content: IsomerToolContent[];
  isError?: boolean;
}

/** A transport-neutral agent tool. */
export interface IsomerTool<TInput extends ZodObject = ZodObject> {
  name: string;
  title: string;
  description: string;
  inputSchema: TInput;
  /** Receives what `inputSchema` parsed. */
  handler(input: output<TInput>): Promise<IsomerToolResult>;
}

/** The surfaces `isomer_render` can target. */
export type IsomerToolSurface = 'text' | 'markdown' | 'html' | 'slack' | 'png';

/** A validation finding, as `validate` reports it. */
export interface IsomerToolsWarning {
  surface: string;
  path?: string | undefined;
  message: string;
}

/** The part of `IsomerRuntime` the tools use, declared structurally so this package does not depend on the runtime. */
export interface IsomerToolsRuntime<THostContext = unknown> {
  getAuthoringContext(): {
    schema: Record<string, unknown>;
    primitives: readonly PrimitiveCatalogEntry[];
    groups?: readonly PrimitiveGroup[] | undefined;
    views?: readonly AuthoringViewSummary[] | undefined;
    describePrimitives(types: readonly string[]): {
      primitives: readonly PrimitiveCatalogEntry[];
      schema: Record<string, unknown>;
    };
  };
  parse(value: unknown): {
    valid: boolean;
    errors: readonly ValidationError[];
    composition?: Composition | undefined;
  };
  validate(composition: Composition): {
    valid: boolean;
    errors: readonly ValidationError[];
    warnings?: readonly IsomerToolsWarning[] | undefined;
  };
  surfaces: {
    text: {
      render(composition: Composition, options?: { heading?: boolean }): string;
    };
    markdown: {
      render(composition: Composition, options?: { heading?: boolean }): string;
    };
    html: {
      render(
        composition: Composition,
        options?: {
          theme?: RenderTheme;
          css?: 'inline' | 'separate';
          heading?: boolean;
        }
      ): { html: string };
    };
    slack: {
      render(composition: Composition, options?: { heading?: boolean }): object;
    };
  };
  viewRegistry: {
    list(): readonly AuthoringViewSummary[];
    request(
      id: string,
      context: THostContext,
      input?: Record<string, unknown>
    ): Promise<{ composition: Composition }>;
  };
}

/** A body rule the runtime does not enforce on every surface, such as the slides frame's single-root rule. A `Frame` from the SDK satisfies this. */
export interface IsomerToolsFrame {
  validateBody?(body: readonly PrimitiveNode[]): readonly string[];
}

/** Rasterizes a validated composition to PNG bytes. */
export type IsomerToolsImage = (
  composition: Composition,
  options: { theme?: RenderTheme }
) => Promise<Uint8Array>;

/** Options for {@link createIsomerTools}, less the view registry's host context. */
export interface IsomerToolsBaseOptions<THostContext = unknown> {
  runtime: IsomerToolsRuntime<THostContext>;
  /** Prose the authoring guide opens with. Defaults to a short generic guide. */
  guide?: string | undefined;
  /** Rendered as the guide's `## Rules` bullets. */
  rules?: readonly string[] | undefined;
  /** Host compositions shown beyond each primitive's catalog example. */
  examples?: readonly unknown[] | undefined;
  /** Defaults to `'compose-from-primitives'`. */
  profile?: AuthoringProfileId | undefined;
  /** Checked against every composition's body alongside runtime validation. */
  frame?: IsomerToolsFrame | undefined;
  /** Offers the `png` surface when present. */
  image?: IsomerToolsImage | undefined;
  /** Whether `isomer_render` draws the composition's title and subtitle. Defaults to `true`; pass `false` when the body carries its own, as a slide's frame does. */
  heading?: boolean | undefined;
}

/** Options for {@link createIsomerTools}. `hostContext` is passed to `viewRegistry.request`, and is required when the runtime's host context does not accept `undefined`. */
export type IsomerToolsOptions<THostContext = unknown> =
  IsomerToolsBaseOptions<THostContext> &
    (undefined extends THostContext
      ? { hostContext?: THostContext }
      : { hostContext: THostContext });
