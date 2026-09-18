/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type Composition,
  formatValidationError,
  formatZodIssues,
  ISOMER_ERROR_CODES,
  IsomerError,
  type PrimitiveNode,
  type ValidationError,
  type ValidationResult,
} from '@elastic/isomer-sdk';
import { z, type ZodType } from 'zod';

export type JsonSchema = Record<string, unknown>;
export type ViewInput = Record<string, unknown>;

/**
 * Thrown by {@link ViewRegistry.request} when a view declares a Zod `input`
 * schema and the supplied input fails validation. `errors` has the same
 * `{ path, message }` shape as composition validation.
 *
 * Identify it by `name`, `code`, `viewId`, and `errors`, never `instanceof`.
 */
export class RegisteredViewInputError extends Error {
  readonly code = ISOMER_ERROR_CODES.VIEW_INPUT_INVALID;
  /** Id of the view whose input failed validation. */
  readonly viewId: string;
  readonly errors: ValidationError[];

  constructor(viewId: string, errors: ValidationError[]) {
    super(
      `Invalid input for view "${viewId}":\n  ${
        errors.map(formatValidationError).join('\n  ') || '(no detail)'
      }`
    );
    this.name = 'RegisteredViewInputError';
    this.viewId = viewId;
    this.errors = errors;
  }
}

/** What a view's `build` receives. */
export interface ViewBuildArgs<THostContext, TInput> {
  /** Whatever the host passes to `request`: a session, a request, a services bundle. */
  context: THostContext;
  /** Validated against the view's `input` schema when it declares one; otherwise the raw record. */
  input: TInput;
}

/** A view registered with a {@link ViewRegistry}, as {@link defineView} builds it. */
export interface RegisteredView<
  THostContext = unknown,
  TInput = ViewInput,
  TNode extends PrimitiveNode = PrimitiveNode,
> {
  /** Unique key within the registry. */
  id: string;
  /** Display name shown to hosts and agents. */
  title: string;
  /** Longer summary of what the view shows. */
  description: string;
  /** Natural-language queries this view should match, for host-side search and routing. */
  answers: string[];
  /**
   * Zod schema for the view's input. When present, `registry.request` parses
   * the input through it before `build` runs (throwing
   * {@link RegisteredViewInputError} on failure) and derives the summary's
   * `inputSchema` from it. When absent, `build` receives the raw record.
   */
  input?: ZodType<TInput>;
  /**
   * Builds the view's composition. Method syntax on purpose: parameter
   * bivariance lets a view typed for its own input sit in a list typed for
   * `unknown`, such as `IsomerRuntimeOptions.views`.
   */
  build(
    args: ViewBuildArgs<THostContext, TInput>
  ): Composition<TNode> | Promise<Composition<TNode>>;
}

/** Options for {@link defineView}: a {@link RegisteredView} with `description` optional. */
export interface DefineViewOptions<
  THostContext,
  TInput,
  TNode extends PrimitiveNode = PrimitiveNode,
> extends Omit<RegisteredView<THostContext, TInput, TNode>, 'description'> {
  /** Longer summary; defaults to `title` when omitted. */
  description?: string;
}

/** Metadata for a registered view, as returned by {@link ViewRegistry.list} / `get`. */
export interface RegisteredViewSummary {
  /** Unique key within the registry. */
  id: string;
  /** Display name shown to hosts and agents. */
  title: string;
  /** Longer summary of what the view shows. */
  description: string;
  /** Natural-language queries this view should match, for host-side search and routing. */
  answers: string[];
  /** JSON Schema for the view's input, derived from its Zod schema when present. */
  inputSchema?: JsonSchema;
}

/** Result of {@link ViewRegistry.request}: the built composition plus its validation result. */
export interface ViewResponse<TNode extends PrimitiveNode = PrimitiveNode> {
  /** Summary of the requested view. */
  view: RegisteredViewSummary;
  /** The composition the view built. */
  composition: Composition<TNode>;
  /** Result of validating `composition`. */
  validation: ValidationResult;
}

/** Registry of views, created by {@link createViewRegistry}. */
export interface ViewRegistry<
  THostContext = unknown,
  TNode extends PrimitiveNode = PrimitiveNode,
> {
  /** Registers a view. Throws if `view.id` is already registered. */
  register: <TInput>(view: RegisteredView<THostContext, TInput, TNode>) => void;
  /** Lists summaries for all registered views. */
  list: () => RegisteredViewSummary[];
  /** Looks up a view's summary by id, or `undefined` if unregistered. */
  get: (id: string) => RegisteredViewSummary | undefined;
  /**
   * Validates `input` against the view's schema (if any), builds its
   * composition, and validates the result. Throws
   * {@link RegisteredViewInputError} on invalid input, or {@link IsomerError}
   * (`UNKNOWN_VIEW`) if `id` is unregistered.
   */
  request: (
    id: string,
    context: THostContext,
    input?: ViewInput
  ) => Promise<ViewResponse<TNode>>;
}

/**
 * Builds a {@link RegisteredView}, defaulting `description` to `title`.
 *
 * Declaring a Zod `input` lets TypeScript infer `build`'s `input` type from
 * the schema, so the two cannot disagree.
 */
export const defineView = <
  THostContext = unknown,
  TInput = ViewInput,
  TNode extends PrimitiveNode = PrimitiveNode,
>(
  options: DefineViewOptions<THostContext, TInput, TNode>
): RegisteredView<THostContext, TInput, TNode> => ({
  ...options,
  description: options.description ?? options.title,
});

/**
 * Creates a {@link ViewRegistry} that validates built compositions with
 * `validateComposition`.
 */
export const createViewRegistry = <
  THostContext = unknown,
  TNode extends PrimitiveNode = PrimitiveNode,
>(
  validateComposition: (composition: Composition<TNode>) => ValidationResult
): ViewRegistry<THostContext, TNode> => {
  const views = new Map<string, RegisteredEntry<THostContext, TNode>>();

  return {
    register: (view) => {
      if (views.has(view.id)) {
        throw new IsomerError(
          'DUPLICATE_VIEW',
          `View "${view.id}" is already registered`
        );
      }
      views.set(view.id, {
        view: view as RegisteredView<THostContext, ViewInput, TNode>,
        summary: toSummary(view),
      });
    },
    list: () => [...views.values()].map(({ summary }) => summary),
    get: (id) => views.get(id)?.summary,
    request: async (id, context, input = {}) => {
      const entry = views.get(id);
      if (!entry) {
        throw new IsomerError('UNKNOWN_VIEW', `Unknown view "${id}"`);
      }
      const { view, summary } = entry;

      const parsedInput = view.input
        ? validateAndParseInput(view.id, view.input, input)
        : input;

      const composition = await view.build({ context, input: parsedInput });
      return {
        view: summary,
        composition,
        validation: validateComposition(composition),
      };
    },
  };
};

/** A view with its summary, projected once so `list`/`get`/`request` never re-run `z.toJSONSchema`. */
interface RegisteredEntry<THostContext, TNode extends PrimitiveNode> {
  view: RegisteredView<THostContext, ViewInput, TNode>;
  summary: RegisteredViewSummary;
}

const validateAndParseInput = (
  viewId: string,
  schema: ZodType<unknown>,
  input: unknown
): never | ViewInput => {
  const result = schema.safeParse(input, { reportInput: true });
  if (!result.success) {
    throw new RegisteredViewInputError(
      viewId,
      formatZodIssues(result.error.issues)
    );
  }
  return result.data as ViewInput;
};

const toSummary = <THostContext, TInput>(
  view: RegisteredView<THostContext, TInput>
): RegisteredViewSummary => {
  const summary: RegisteredViewSummary = {
    id: view.id,
    title: view.title,
    description: view.description,
    answers: view.answers,
  };

  if (view.input) {
    summary.inputSchema = toInputJsonSchema(view.input);
  }

  return summary;
};

const inputIdRegistry = z.registry<{ id: string }>();

const toInputJsonSchema = (schema: ZodType<unknown>): JsonSchema =>
  z.toJSONSchema(schema, {
    target: 'draft-2020-12',
    metadata: inputIdRegistry,
    reused: 'inline',
    cycles: 'ref',
    unrepresentable: 'any',
  });
