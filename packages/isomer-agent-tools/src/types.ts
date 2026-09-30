/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Composition,
  ParsedComposition,
  PrimitiveCatalogEntry,
  PrimitiveGroup,
  PrimitiveNode,
  RenderTheme,
  ValidationResult,
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

/** A tool's answer, shaped like an MCP `CallToolResult`. `isError` marks a call the model cannot use as-is. */
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
  handler(input: output<TInput>): Promise<IsomerToolResult>;
}

/** Text an agent reads by URI, such as an MCP resource. `read` is live, so registered views stay current. */
export interface IsomerResource {
  name: string;
  uri: string;
  title: string;
  description: string;
  mimeType: 'text/markdown' | 'application/json';
  read(): string;
}

/** A message an agent starts from, such as an MCP prompt or a system message. */
export interface IsomerPrompt<TArgs extends ZodObject = ZodObject> {
  name: string;
  title: string;
  description: string;
  argsSchema: TArgs;
  build(args: output<TArgs>): string;
}

/** The surfaces `isomer_render` can target. */
export type IsomerToolSurface = 'text' | 'markdown' | 'html' | 'slack' | 'png';

/** The part of `IsomerRuntime` the tools use. An `IsomerRuntime` satisfies it. */
export interface IsomerToolsRuntime<THostContext = unknown> {
  getAuthoringContext(): {
    schema: Record<string, unknown>;
    primitives: readonly PrimitiveCatalogEntry[];
    groups: readonly PrimitiveGroup[];
    views: readonly AuthoringViewSummary[];
    describePrimitives(types: readonly string[]): {
      primitives: readonly PrimitiveCatalogEntry[];
      schema: Record<string, unknown>;
    };
  };
  parse(value: unknown): ParsedComposition;
  validate(composition: Composition): ValidationResult;
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
        options?: { theme?: RenderTheme; css?: 'inline'; heading?: boolean }
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

/** A body rule the runtime does not enforce on every surface. An SDK `Frame` satisfies this. */
export interface IsomerToolsFrame {
  validateBody?(body: readonly PrimitiveNode[]): readonly string[];
}

/** Rasterizes a validated composition to PNG bytes. */
export type IsomerToolsImage = (
  composition: Composition,
  options: { theme?: RenderTheme }
) => Promise<Uint8Array>;

/** Options for {@link createIsomerTools}, less `hostContext`. */
export interface IsomerToolsBaseOptions<THostContext = unknown> {
  runtime: IsomerToolsRuntime<THostContext>;
  /** Prose the authoring guide opens with. */
  guide?: string | undefined;
  /** The guide's `## Rules`, one bullet each. */
  rules?: readonly string[] | undefined;
  /** Host compositions for the guide's `## Examples`, trimmed to the profile's budget. */
  examples?: readonly unknown[] | undefined;
  /** Defaults to `'compose-from-primitives'`. */
  profile?: AuthoringProfileId | undefined;
  /** Checked against every composition's body alongside runtime validation. */
  frame?: IsomerToolsFrame | undefined;
  /** Adds the `png` surface. */
  image?: IsomerToolsImage | undefined;
  /** Whether `isomer_render` draws the title and subtitle on every surface but `png`. Defaults to `true`. */
  heading?: boolean | undefined;
}

/** Options for {@link createIsomerTools}. `hostContext` reaches `viewRegistry.request`, and is required when the runtime's host context excludes `undefined`. */
export type IsomerToolsOptions<THostContext = unknown> =
  IsomerToolsBaseOptions<THostContext> &
    (undefined extends THostContext
      ? { hostContext?: THostContext }
      : { hostContext: THostContext });

/** Options for the guide, the resources, and the prompts. */
export type IsomerGuideOptions = Pick<
  IsomerToolsBaseOptions,
  'runtime' | 'guide' | 'rules' | 'examples' | 'profile'
>;
