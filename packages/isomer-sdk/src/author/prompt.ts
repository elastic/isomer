/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '../define/primitive_module';

type JsonSchema = Record<string, unknown>;

/** Which authoring job the prompt frames for the model. */
export type AuthoringProfileId =
  'general' | 'registered-view-router' | 'compose-from-primitives';

/** Every {@link AuthoringProfileId}. */
export const AUTHORING_PROFILE_IDS: readonly AuthoringProfileId[] = [
  'general',
  'registered-view-router',
  'compose-from-primitives',
];

/**
 * A registered view, declared structurally so this module does not import the
 * runtime. {@link RegisteredViewSummary} must stay assignable to this.
 */
export interface AuthoringViewSummary {
  id: string;
  title: string;
  description?: string;
  answers: readonly string[];
  inputSchema?: JsonSchema;
}

/** The pack-supplied material {@link buildAuthoringPrompt} assembles. */
export interface AuthoringPromptContext {
  guide: string;
  /** Absent or empty drops the `## Rules` section. */
  rules?: string;
  /** JSON Schema for a whole composition. The router profile does not inline it. */
  schema: JsonSchema;
  /** Rendered as a bullet per entry, with its `useWhen`, `avoidWhen`, and `example`. */
  primitives: readonly PrimitiveCatalogEntry[];
  /**
   * Extra host-supplied compositions beyond each primitive's catalog example.
   * Trimmed to the profile's budget. An empty list drops `## Examples`.
   */
  examples: readonly unknown[];
  /** Registered views the model can request by id. An empty list drops the section. */
  views?: readonly AuthoringViewSummary[];
  /** Defaults to `'# View authoring'`. */
  heading?: string;
  /** Replaces the profile's own framing sentence. */
  intro?: string;
}

const PROFILE_INTROS: Record<AuthoringProfileId, string> = {
  general:
    'You author views: compact, host-portable operational displays expressed as a single JSON object. Route to a registered view when one answers the question; otherwise compose a view from the primitive catalog below.',
  'registered-view-router':
    'You route questions to registered views. Prefer an existing registered view whose answers index matches the question; request it by id with its input. Only fall back to composing a view when no registered view fits, using the catalog below.',
  'compose-from-primitives':
    'You compose views from scratch. Build a single JSON object that answers the question using only the primitives in the catalog below, and validate your output mentally against the JSON Schema before responding.',
};

/** Host-supplied composition examples kept after each primitive already shows its shape. */
const PROFILE_EXAMPLE_LIMITS: Record<AuthoringProfileId, number> = {
  general: 1,
  'registered-view-router': 0,
  'compose-from-primitives': 1,
};

const PROFILE_INCLUDES_SCHEMA: Record<AuthoringProfileId, boolean> = {
  general: true,
  'registered-view-router': false,
  'compose-from-primitives': true,
};

const compactJson = (value: unknown): string => JSON.stringify(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Host examples show composition, not provenance. */
const withoutMeta = (value: unknown): unknown => {
  if (!isRecord(value) || !('meta' in value)) {
    return value;
  }
  const rest = { ...value };
  delete rest.meta;
  return rest;
};

const renderCatalog = (primitives: readonly PrimitiveCatalogEntry[]): string =>
  primitives
    .map((entry) => {
      const lines = [`- \`${entry.type}\` — ${entry.purpose}`];
      if (entry.useWhen.length > 0) {
        lines.push(`  - Use when: ${entry.useWhen.join(' ')}`);
      }
      if (entry.avoidWhen.length > 0) {
        lines.push(`  - Avoid when: ${entry.avoidWhen.join(' ')}`);
      }
      lines.push(`  - Example: \`${compactJson(entry.example)}\``);
      return lines.join('\n');
    })
    .join('\n');

const renderViews = (views: readonly AuthoringViewSummary[]): string =>
  views
    .map((view) => {
      const lines = [`- \`${view.id}\` — ${view.title}`];
      if (view.description !== undefined && view.description.length > 0) {
        lines.push(`  - ${view.description}`);
      }
      if (view.answers.length > 0) {
        lines.push(`  - Answers: ${view.answers.join('; ')}`);
      }
      if (view.inputSchema !== undefined) {
        lines.push(`  - Input: \`${compactJson(view.inputSchema)}\``);
      }
      return lines.join('\n');
    })
    .join('\n');

const renderExamples = (examples: readonly unknown[]): string =>
  examples
    .map(
      (example) => `\`\`\`json\n${compactJson(withoutMeta(example))}\n\`\`\``
    )
    .join('\n\n');

/**
 * Assembles `context` into the prompt for `profile`, trimming the examples to
 * that profile's budget.
 *
 * The copy says "view" throughout because that is the wire discriminator and
 * the word models are trained and prompted on; pass `heading` and `intro` to
 * override it per host.
 */
export const buildAuthoringPrompt = (
  profile: AuthoringProfileId,
  context: AuthoringPromptContext
): string => {
  const examples = context.examples
    .slice(0, PROFILE_EXAMPLE_LIMITS[profile])
    .map(withoutMeta);
  const views = context.views ?? [];
  const sections = [
    context.heading ?? '# View authoring',
    context.intro ?? PROFILE_INTROS[profile],
    `## Guide\n\n${context.guide}`,
  ];
  if (context.rules !== undefined && context.rules.length > 0) {
    sections.push(`## Rules\n\n${context.rules}`);
  }
  if (views.length > 0) {
    sections.push(`## Registered views\n\n${renderViews(views)}`);
  }
  sections.push(`## Primitive catalog\n\n${renderCatalog(context.primitives)}`);
  if (PROFILE_INCLUDES_SCHEMA[profile]) {
    sections.push(
      `## JSON Schema\n\n\`\`\`json\n${compactJson(context.schema)}\n\`\`\``
    );
  }
  if (examples.length > 0) {
    sections.push(`## Examples\n\n${renderExamples(examples)}`);
  }
  return sections.join('\n\n');
};

/** The guide/rules/schema/catalog every primitive pack composes into its own authoring context and prompt. */
export interface AgentAuthoringContextDefaults {
  guide: string;
  rules: string;
  schema: JsonSchema;
  primitives: readonly PrimitiveCatalogEntry[];
  views?: readonly AuthoringViewSummary[];
}

/** The only part of an authoring context a caller supplies per request. */
export interface AgentAuthoringContextOptions<TExample = unknown> {
  /** Defaults to none, which drops the `## Examples` section from the prompt. */
  examples?: readonly TExample[];
  views?: readonly AuthoringViewSummary[];
}

/**
 * Every primitive pack repeats the same shape: guide + rules + schema +
 * catalog, plus caller-supplied examples. This closes over a pack's defaults
 * so its own context getter is a one-liner.
 */
export const createAgentAuthoringContextFactory =
  <TExample = unknown>(defaults: AgentAuthoringContextDefaults) =>
  ({ examples = [], views }: AgentAuthoringContextOptions<TExample> = {}): Omit<
    AuthoringPromptContext,
    'examples'
  > & { examples: readonly TExample[] } => {
    const resolvedViews = views ?? defaults.views;
    return {
      ...defaults,
      examples,
      ...(resolvedViews === undefined ? {} : { views: resolvedViews }),
    };
  };

/**
 * Wraps {@link buildAuthoringPrompt} with a pack's defaults, falling back
 * field-by-field when a caller passes a partial context (e.g. a custom guide
 * with the pack's own rules and schema).
 */
export const createAuthoringPromptBuilder =
  (defaults: AgentAuthoringContextDefaults) =>
  (
    profile: AuthoringProfileId,
    context: Partial<AuthoringPromptContext> = {}
  ): string => {
    const resolvedViews = context.views ?? defaults.views;
    return buildAuthoringPrompt(profile, {
      guide: context.guide ?? defaults.guide,
      rules: context.rules ?? defaults.rules,
      schema: context.schema ?? defaults.schema,
      primitives: context.primitives ?? defaults.primitives,
      examples: context.examples ?? [],
      ...(resolvedViews === undefined ? {} : { views: resolvedViews }),
    });
  };
