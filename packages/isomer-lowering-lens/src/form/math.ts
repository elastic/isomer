/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import { own } from '../own';

// `@kbn/tinymath`'s AST as Lens persists it in a `math` column's
// `params.tinymathAst`: a number, a referenced column's ID or variable, or a
// function.

export type MathNode =
  | number
  | { type: 'variable'; value: string }
  | { type: 'function'; name: string; args: MathNode[] };

const location = z.object({ min: z.number(), max: z.number() }).strict();

export const mathNodeSchema: z.ZodType<MathNode> = z.lazy(() =>
  z.union([
    z.number().finite(),
    // Lens persists a referenced column as its bare ID.
    z
      .string()
      .min(1)
      .transform((value) => ({ type: 'variable' as const, value })),
    z
      .object({
        type: z.literal('variable'),
        value: z.string().min(1),
        text: z.string().optional(),
        location: location.optional(),
      })
      .strict()
      .transform(({ value }) => ({ type: 'variable' as const, value })),
    z
      .object({
        type: z.literal('function'),
        name: z.string().min(1),
        args: z.array(mathNodeSchema),
        text: z.string().optional(),
        location: location.optional(),
      })
      .strict()
      .transform(({ name, args }) => ({
        type: 'function' as const,
        name,
        args,
      })),
  ])
);

/** Lens formula's math functions and their arity: `@kbn/lens-formula-docs` `src/math`. */
export const MATH_FUNCTIONS: Record<
  string,
  readonly [min: number, max: number]
> = {
  add: [2, 2],
  subtract: [2, 2],
  multiply: [2, 2],
  divide: [2, 2],
  abs: [1, 1],
  cbrt: [1, 1],
  ceil: [1, 1],
  clamp: [3, 3],
  cube: [1, 1],
  exp: [1, 1],
  fix: [1, 1],
  floor: [1, 1],
  log: [1, 2],
  mod: [2, 2],
  pow: [2, 2],
  round: [1, 2],
  sqrt: [1, 1],
  square: [1, 1],
  pick_max: [2, 2],
  pick_min: [2, 2],
  defaults: [2, 2],
  lt: [2, 2],
  gt: [2, 2],
  eq: [2, 2],
  lte: [2, 2],
  gte: [2, 2],
  ifelse: [3, 3],
};

/** Variables a math node reads, or the first problem with its shape. */
export const checkMath = (
  node: MathNode
): { ok: true; variables: Set<string> } | { ok: false; message: string } => {
  const variables = new Set<string>();
  const visit = (current: MathNode): string | undefined => {
    if (typeof current === 'number') {
      return undefined;
    }
    if (current.type === 'variable') {
      variables.add(current.value);
      return undefined;
    }
    const arity = own(MATH_FUNCTIONS, current.name);
    if (!arity) {
      return `"${current.name}" is not a Lens formula math function.`;
    }
    const [min, max] = arity;
    if (current.args.length < min || current.args.length > max) {
      return `"${current.name}" takes ${min === max ? min : `${min} to ${max}`} arguments, not ${current.args.length}.`;
    }
    for (const arg of current.args) {
      const problem = visit(arg);
      if (problem) {
        return problem;
      }
    }
    return undefined;
  };
  const problem = visit(node);
  return problem ? { ok: false, message: problem } : { ok: true, variables };
};
