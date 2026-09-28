/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { core } from 'zod';

import {
  BODY_NODE_SURFACES,
  type BodyNodeSurface,
  childNodePath,
  type ChildNodeWalker,
  createChildNodeWalker,
  isVisibleOnSurface,
  rendersOnSurface,
} from '../composition/body_node_base';
import type { Composition } from '../composition/composition';
import { nameText, quoteInput } from '../composition/one_line';
import {
  CompositionValidationError,
  type ValidationError,
} from '../composition/validation_error';
import type { AnyPrimitiveDefinition } from '../define/primitive_module';
import { formatPath, formatZodIssue } from '../define/zod_format';

import { getCompositionSchemaForDefinitions } from './composition_schema';

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
  surface: BodyNodeSurface;
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
  /** Set when the input is past {@link MAX_COMPOSITION_DEPTH} or {@link MAX_COMPOSITION_VALUES}, so no render can take it. */
  refused?: true;
}

/** Narrows a result's warnings to the surface a caller is about to render. */
export const warningsForSurface = (
  result: ValidationResult,
  surface: BodyNodeSurface
): ValidationWarning[] =>
  result.warnings.filter((warning) => warning.surface === surface);

/** Whether a render reports validation findings or raises on them. */
export type ValidationErrorMode = 'collect' | 'throw';

export { CompositionValidationError };

/** Raises {@link CompositionValidationError} when `result` is invalid and `mode` is `throw`, or in either mode when `result` is {@link ValidationResult.refused}. */
export const enforceValidationMode = (
  result: ValidationResult,
  mode?: ValidationErrorMode
): void => {
  if (!result.valid && (mode === 'throw' || result.refused)) {
    throw new CompositionValidationError(result.errors);
  }
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
}

/**
 * Each node `walk` reaches in `value`'s body, by the path an issue inside it
 * starts with. A node the walk cannot descend, being malformed, adds no children.
 */
const nodeTypesByPath = (
  value: unknown,
  walk: ChildNodeWalker
): Map<string, string> => {
  const types = new Map<string, string>();
  const visit = (node: unknown, path: string): void => {
    if (typeof node !== 'object' || node === null) {
      return;
    }
    const { type } = node as { type?: unknown };
    if (typeof type === 'string') {
      types.set(path, type);
    }
    let children: ReturnType<ChildNodeWalker>;
    try {
      children = walk(node);
    } catch {
      return;
    }
    children.forEach(({ node: child, path: field }) => {
      visit(child, childNodePath(path, field));
    });
  };
  const { body } = (value ?? {}) as { body?: unknown };
  if (Array.isArray(body)) {
    body.forEach((node, index) => visit(node, `body[${index}]`));
  }
  return types;
};

/** The `type` of the innermost node of a known primitive type `segments` lands in. */
const nodeTypeAt = (
  nodes: ReadonlyMap<string, string>,
  segments: readonly PropertyKey[],
  fields: ReadonlyMap<string, unknown>
): string | undefined => {
  let found: string | undefined;
  let path = '';
  for (const segment of segments) {
    path = formatPath([segment], path);
    const type = nodes.get(path);
    if (type !== undefined && fields.has(type)) {
      found = type;
    }
  }
  return found;
};

/**
 * {@link formatZodIssue} per issue, each error naming the primitive its path lands in,
 * and an unknown key on a node listing the fields that node takes. Past
 * {@link MAX_VALIDATION_ERRORS}, one last error counts the rest.
 */
const formatIssuesIn = (
  value: unknown,
  issues: ReadonlyArray<core.$ZodIssue>,
  fields: ReadonlyMap<string, readonly string[]>,
  walk: ChildNodeWalker
): ValidationError[] => {
  const nodes = nodeTypesByPath(value, walk);
  const errors = issues.slice(0, MAX_VALIDATION_ERRORS).map((issue) => {
    const error = formatZodIssue(issue);
    const nodeType = nodeTypeAt(nodes, issue.path, fields);
    if (nodeType === undefined) {
      return error;
    }
    const onNode =
      issue.code === 'unrecognized_keys' && nodes.get(error.path) === nodeType;
    const message = onNode
      ? `${error.message}; its fields are ${(fields.get(nodeType) ?? []).map(nameText).join(', ')}`
      : error.message;
    return { ...error, message, nodeType };
  });
  return capErrors(errors, issues.length);
};

/** Errors a result lists before one more error counts the rest. */
export const MAX_VALIDATION_ERRORS = 50;

/** The first {@link MAX_VALIDATION_ERRORS} of `total` errors, and one last error counting the rest. */
const capErrors = (
  errors: readonly ValidationError[],
  total = errors.length
): ValidationError[] => {
  const listed = errors.slice(0, MAX_VALIDATION_ERRORS);
  const rest = total - listed.length;
  return rest > 0
    ? [...listed, { path: '', message: `and ${rest} more errors not listed` }]
    : listed;
};

/** Nesting of arrays and objects past which input is refused before the schema runs. The deepest slide the slides pack ships nests 16. */
export const MAX_COMPOSITION_DEPTH = 64;

/** Values, containers and leaves alike, past which input is refused before the schema runs. */
export const MAX_COMPOSITION_VALUES = 20_000;

/** Why `value` is too deep or too large to parse, found without recursion. */
const inputBoundError = (value: unknown): ValidationError | undefined => {
  const pending: [unknown, number][] = [[value, 1]];
  let seen = 0;
  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    const [item, depth] = next;
    seen += 1;
    if (typeof item !== 'object' || item === null) {
      continue;
    }
    if (depth > MAX_COMPOSITION_DEPTH) {
      return {
        path: '',
        message: `nests deeper than ${MAX_COMPOSITION_DEPTH} levels of arrays and objects`,
      };
    }
    const size = Array.isArray(item) ? item.length : Object.keys(item).length;
    if (seen + pending.length + size > MAX_COMPOSITION_VALUES) {
      return {
        path: '',
        message: `holds more than ${MAX_COMPOSITION_VALUES} values`,
      };
    }
    for (const entry of Object.values(item)) {
      pending.push([entry, depth + 1]);
    }
  }
  return undefined;
};

/** Fields every node has, which the authoring schema leaves out. */
const COMMON_FIELDS = new Set(['type', 'id', 'surfaces']);

/** Each primitive's type, and the fields its node takes besides the common ones. */
const fieldsOf = (
  definitions: readonly AnyPrimitiveDefinition[]
): Map<string, string[]> =>
  new Map(
    definitions.map(({ type, schema }) => [
      type,
      Object.keys(schema.shape).filter((key) => !COMMON_FIELDS.has(key)),
    ])
  );

/**
 * Builds the trusted-input validator: schema, then the semantic passes.
 *
 * `definitions` is memoized on array identity, so a caller that rebuilds the
 * array per call (`createCompositionValidator(packs.flatMap(…))`) gets a fresh
 * 42-member discriminated union each time. Hold the array `composePacks`
 * returns and reuse it across the validator, the parser, and the authoring
 * context.
 */
export const createCompositionValidator = (
  definitions: readonly AnyPrimitiveDefinition[],
  options: CompositionValidatorOptions = {}
): ((composition: Composition) => ValidationResult) => {
  const schema = getCompositionSchemaForDefinitions(definitions);
  const walk = createChildNodeWalker(definitions);
  const fields = fieldsOf(definitions);
  return (composition) => {
    const bound = inputBoundError(composition);
    if (bound !== undefined) {
      return { valid: false, errors: [bound], warnings: [], refused: true };
    }
    const result = schema.safeParse(composition, { reportInput: true });
    if (result.success) {
      const idErrors = capErrors(
        collectDuplicateNodeIdErrors(composition.body, walk)
      );
      const warnings = [
        ...collectEmptySurfaceWarnings(composition.body, walk),
        ...(options.sizesFromNodeHeights
          ? collectMissingSvgHeightWarnings(composition.body, definitions, walk)
          : []),
      ];
      return { valid: idErrors.length === 0, errors: idErrors, warnings };
    }
    return {
      valid: false,
      errors: formatIssuesIn(composition, result.error.issues, fields, walk),
      warnings: [],
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
 * Builds the untrusted-input parser: schema only, reported rather than thrown.
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
  definitions: readonly AnyPrimitiveDefinition[]
): ((value: unknown) => ParsedComposition) => {
  const schema = getCompositionSchemaForDefinitions(definitions);
  const walk = createChildNodeWalker(definitions);
  const fields = fieldsOf(definitions);
  return (value) => {
    const bound = inputBoundError(value);
    if (bound !== undefined) {
      return { valid: false, errors: [bound] };
    }
    const result = schema.safeParse(value, { reportInput: true });
    if (result.success) {
      return {
        valid: true,
        errors: [],
        composition: result.data as unknown as Composition,
      };
    }
    return {
      valid: false,
      errors: formatIssuesIn(value, result.error.issues, fields, walk),
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
        message: `${path} type ${quoteInput(type)} declares no svgHeight metric and will be measured as 0, sizing the frame short`,
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
          message: `duplicates id ${quoteInput(id)} first used at ${first}`,
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
