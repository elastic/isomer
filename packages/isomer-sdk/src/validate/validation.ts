/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BODY_NODE_SURFACES,
  childNodePath,
  createChildNodeWalker,
  isVisibleOnSurface,
  rendersOnSurface,
  type SurfaceName,
} from '../composition/body_node_base';
import type { Composition } from '../composition/composition';
import type { PrimitiveNode } from '../composition/node';
import { quoteText } from '../composition/one_line';
import {
  CompositionValidationError,
  type ValidationError,
} from '../composition/validation_error';
import type { AnyPrimitiveDefinition } from '../define/primitive_module';

import { getCompositionSchemaForDefinitions } from './composition_schema';
import {
  checkInputBudget,
  INPUT_REFUSAL_CODES,
  type InputBudget,
} from './input_budget';
import { createNodeIssueFormatter, type IssueRoot } from './node_issues';

/**
 * A non-fatal validation finding, scoped to the surface it concerns.
 *
 * Warnings carry `surface` because every one of them is a statement about one
 * render target — a composition that draws nothing on `slack` is not news to a
 * caller rendering HTML. Without the scope a host receives every surface's
 * findings on every call and learns to ignore the channel.
 * {@link warningsForSurface} is the filter.
 */
export interface ValidationWarning {
  /** The render target this finding concerns, never the composition as a whole. */
  surface: SurfaceName;
  /**
   * Path of the offending node within the composition, absent for
   * whole-composition findings.
   */
  path?: string;
  /** Safe to show a user, and phrased for whoever can act on it. */
  message: string;
}

/**
 * The outcome of `validate`: errors are fatal, warnings are advisory.
 *
 * `valid` tracks `errors` only — a composition can be valid and still carry
 * warnings, which is the normal case for a surface gap.
 */
export interface ValidationResult {
  /** True when `errors` is empty, regardless of `warnings`. */
  valid: boolean;
  /** Fatal findings. Empty when `valid`. */
  errors: ValidationError[];
  /** Advisory findings, empty when there are none. */
  warnings: ValidationWarning[];
}

const checkedComposition = Symbol.for('elastic.isomer.checked_composition');

/** The copy {@link createCompositionValidator} checked, which a validating render draws in place of the caller's value. The brand is type-only. */
export type CheckedComposition<TNode extends PrimitiveNode = PrimitiveNode> =
  Composition<TNode> & { readonly [checkedComposition]: true };

/** A {@link ValidationResult} with the composition it describes. */
export interface CheckedValidationResult<
  TNode extends PrimitiveNode = PrimitiveNode,
> extends ValidationResult {
  /** Undefined only when {@link checkInputBudget} refused the input. */
  composition: CheckedComposition<TNode> | undefined;
}

/** Narrows a result's warnings to the surface a caller is about to render. */
export const warningsForSurface = (
  result: ValidationResult,
  surface: SurfaceName
): ValidationWarning[] =>
  result.warnings.filter((warning) => warning.surface === surface);

/** Whether a render reports validation findings or raises on them. */
export type ValidationErrorMode = 'collect' | 'throw';

export { CompositionValidationError };

/** Raises {@link CompositionValidationError} when `mode` is `throw` and `result` is invalid, or in any mode when {@link checkInputBudget} refused the input, which nothing can render. */
export const enforceValidationMode = (
  result: ValidationResult,
  mode?: ValidationErrorMode
): void => {
  if (
    !result.valid &&
    (mode === 'throw' ||
      result.errors.some(({ code }) => INPUT_REFUSAL_CODES.has(code)))
  ) {
    throw new CompositionValidationError(result.errors);
  }
};

/** The composition `result` checked, which is what a render draws. Throws {@link CompositionValidationError} when `mode` is `'throw'` and `result` is invalid, or in any mode when {@link checkInputBudget} refused the input. */
export const compositionToRender = <TNode extends PrimitiveNode>(
  result: CheckedValidationResult<TNode>,
  mode?: ValidationErrorMode
): CheckedComposition<TNode> => {
  enforceValidationMode(result, mode);
  const { composition } = result;
  if (composition === undefined) {
    throw new CompositionValidationError(result.errors);
  }
  return composition;
};

/** Runtime facts the semantic passes need beyond the primitive inventory. */
export interface CompositionValidatorOptions {
  /**
   * Whether any frame the runtime can draw with sizes itself from node heights,
   * which is what makes a missing `metrics.svgHeight` matter.
   *
   * A runtime-wide question rather than a per-node one, because a frame is a
   * runtime input: any node can be drawn under any frame, so the metric is
   * load-bearing as soon as one frame consults it. Defaults to `false`, so a
   * runtime with no frame at all reports nothing about a value nothing reads.
   */
  sizesFromNodeHeights?: boolean;
  /** Limits checked before the schema runs; see {@link checkInputBudget}. */
  inputBudget?: InputBudget;
}

/** The body's nodes, as {@link IssueRoot}s for a node issue formatter. */
const bodyRoots = (value: unknown): IssueRoot[] => {
  const { body } = (value ?? {}) as { body?: unknown };
  return Array.isArray(body)
    ? body.map((node, index) => [node, `body[${index}]`] as const)
    : [];
};

/**
 * Builds the trusted-input validator: {@link checkInputBudget}, then the schema and the semantic passes on its copy, which the result carries.
 *
 * `definitions` is memoized on array identity, so a caller that rebuilds the
 * array per call (`createCompositionValidator(packs.flatMap(…))`) gets a fresh
 * 42-member discriminated union each time. Hold the array `composePacks`
 * returns and reuse it across the validator, the parser, and the authoring
 * context.
 */
export const createCompositionValidator = <
  TNode extends PrimitiveNode = PrimitiveNode,
>(
  definitions: readonly AnyPrimitiveDefinition[],
  options: CompositionValidatorOptions = {}
): ((composition: Composition<TNode>) => CheckedValidationResult<TNode>) => {
  const schema = getCompositionSchemaForDefinitions(definitions);
  const walk = createChildNodeWalker(definitions);
  const formatIssues = createNodeIssueFormatter(definitions);
  return (composition) => {
    const checked = checkInputBudget(composition, options.inputBudget);
    if (!checked.valid) {
      return {
        valid: false,
        errors: [checked.error],
        warnings: [],
        composition: undefined,
      };
    }
    const plain = checked.value as CheckedComposition<TNode>;
    const result = schema.safeParse(plain, { reportInput: true });
    if (result.success) {
      const { body } = plain;
      const idErrors = collectDuplicateNodeIdErrors(body, walk);
      const warnings = [
        ...collectEmptySurfaceWarnings(body, walk),
        ...(options.sizesFromNodeHeights
          ? collectMissingSvgHeightWarnings(body, definitions, walk)
          : []),
      ];
      return {
        valid: idErrors.length === 0,
        errors: idErrors,
        warnings,
        composition: plain,
      };
    }
    return {
      valid: false,
      errors: formatIssues(bodyRoots(plain), result.error.issues),
      warnings: [],
      composition: plain,
    };
  };
};

/** The outcome of `parse`. */
export interface ParsedComposition {
  /** True when the value matched the schema. Says nothing about id uniqueness. */
  valid: boolean;
  /** Schema failures. Empty when `valid`. */
  errors: ValidationError[];
  /** The parsed document, present only when `valid`. */
  composition?: Composition;
}

/**
 * Builds the untrusted-input parser: {@link checkInputBudget}, then the schema only on its copy, reported rather than thrown.
 *
 * Deliberately narrower than {@link createCompositionValidator}. This answers
 * "is this a `Composition`", not "is this a good one" — it does not run the
 * duplicate-id pass or produce warnings, so a composition with two nodes
 * sharing an `id` parses as valid. Id uniqueness is a `validate` guarantee, so
 * a caller that wants the semantic checks runs `validate` on the result.
 *
 * Shares {@link createCompositionValidator}'s memoization identity requirement.
 */
export const createCompositionParser = (
  definitions: readonly AnyPrimitiveDefinition[],
  { inputBudget }: Pick<CompositionValidatorOptions, 'inputBudget'> = {}
): ((value: unknown) => ParsedComposition) => {
  const schema = getCompositionSchemaForDefinitions(definitions);
  const formatIssues = createNodeIssueFormatter(definitions);
  return (value) => {
    const checked = checkInputBudget(value, inputBudget);
    if (!checked.valid) {
      return { valid: false, errors: [checked.error] };
    }
    const result = schema.safeParse(checked.value, { reportInput: true });
    if (result.success) {
      return {
        valid: true,
        errors: [],
        composition: result.data as unknown as Composition,
      };
    }
    return {
      valid: false,
      errors: formatIssues(bodyRoots(checked.value), result.error.issues),
    };
  };
};

/** Warns once per surface that the whole body renders nothing on. */
const collectEmptySurfaceWarnings = (
  body: readonly unknown[],
  walk: ReturnType<typeof createChildNodeWalker>
): ValidationWarning[] =>
  BODY_NODE_SURFACES.filter(
    (surface) => !body.some((node) => rendersOnSurface(node, surface, walk))
  ).map((surface) => ({
    surface,
    message: `composition renders no nodes on surface "${surface}"`,
  }));

/**
 * Warns for each node that renders to `svg` but declares no `svgHeight`.
 *
 * `metrics.svgHeight` is optional, so `dispatcher.estimateSvgHeight` returns
 * `0` for such a node and a frame that sums node heights sizes short.
 *
 * Whether a runtime consults the metric at all is the caller's to decide; see
 * {@link CompositionValidatorOptions.sizesFromNodeHeights}. A fixed-size frame
 * never does, and reporting nine warnings per composition for a value nothing
 * reads is how a warning channel gets ignored.
 */
const collectMissingSvgHeightWarnings = (
  body: readonly unknown[],
  definitions: readonly AnyPrimitiveDefinition[],
  walk: ReturnType<typeof createChildNodeWalker>
): ValidationWarning[] => {
  const unmeasured = new Set(
    definitions
      .filter((definition) => !definition.metrics?.svgHeight)
      .map((definition) => definition.type)
  );
  if (unmeasured.size === 0) {
    return [];
  }
  const warnings: ValidationWarning[] = [];
  const visit = (node: unknown, path: string): void => {
    if (!node || typeof node !== 'object' || !isVisibleOnSurface(node, 'svg')) {
      return;
    }
    const { type } = node as { type?: unknown };
    if (typeof type === 'string' && unmeasured.has(type)) {
      warnings.push({
        surface: 'svg',
        path,
        message: `${path} type ${quoteText(type)} declares no svgHeight metric and will be measured as 0, sizing the frame short`,
      });
    }
    walk(node).forEach(({ node: child, path: field }) => {
      visit(child, childNodePath(path, field));
    });
  };
  body.forEach((node, index) => visit(node, `body[${index}]`));
  return warnings;
};

/**
 * Errors for each node whose `id` repeats one already seen, naming the first
 * use.
 *
 * Errors rather than warnings, because ids are what a host addresses a node by.
 * Run by `validate` and deliberately not by `parse`; see
 * {@link createCompositionParser}.
 */
const collectDuplicateNodeIdErrors = (
  body: readonly unknown[],
  walk: ReturnType<typeof createChildNodeWalker>
): ValidationError[] => {
  const errors: ValidationError[] = [];
  const seen = new Map<string, string>();
  const visit = (node: unknown, path: string): void => {
    if (!node || typeof node !== 'object') {
      return;
    }
    const { id, type } = node as { id?: unknown; type?: unknown };
    if (typeof id === 'string') {
      const first = seen.get(id);
      if (first) {
        errors.push({
          path: `${path}.id`,
          message: `duplicates id ${quoteText(id)} first used at ${first}`,
          ...(typeof type === 'string' ? { nodeType: type } : {}),
        });
      } else {
        seen.set(id, path);
      }
    }
    walk(node).forEach(({ node: child, path: field }) => {
      visit(child, childNodePath(path, field));
    });
  };
  body.forEach((node, index) => visit(node, `body[${index}]`));
  return errors;
};
