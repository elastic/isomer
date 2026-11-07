/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@elastic/isomer-sdk/schema';

import type { ChartColumn, ColumnType } from './data';

/** The rule every chart states for its column references. */
export const COLUMN_REF_RULE =
  'Every column reference names a column in `data.columns`.';

/** A column id, checked against `data.columns` by the chart that holds it. */
export const columnRefSchema = z
  .string()
  .min(1)
  .describe(`A column id. ${COLUMN_REF_RULE}`);

/** One column id found in a node, where it was found, and the types it accepts. */
export interface ColumnReference {
  path: (string | number)[];
  id: string;
  /** Types the reference accepts. Absent means any. */
  types?: readonly ColumnType[];
  /** Whether the column must not be `multivalue`. */
  single?: boolean;
  /** Reported in place of the rules' `type` sentence for this reference. */
  rule?: string;
}

/** The sentences a failed reference reports. */
interface ColumnReferenceRules {
  /** Reported for a reference that names no column. */
  missing: string;
  /** Reported for a reference to a column of a type it does not accept. */
  type: string;
  /** Reported for a `single` reference to a `multivalue` column. Absent means `type`. */
  single?: string;
  /** What the missing thing is called in the message. Absent means "column". */
  noun?: string;
}

/**
 * Adds an issue for each reference that names no column of `data`, or a column
 * of a type it does not accept.
 */
export const checkColumnReferences = (
  data: { readonly columns: readonly ChartColumn[] } | undefined,
  references: readonly ColumnReference[],
  context: z.core.$RefinementCtx<unknown>,
  rules: ColumnReferenceRules
): void => {
  const byId = new Map(
    (data?.columns ?? []).map((column) => [column.id, column])
  );
  for (const { path, id, types, single, rule } of references) {
    const column = byId.get(id);
    if (!column) {
      context.addIssue({
        code: 'custom',
        path,
        message: `${rules.missing} No ${rules.noun ?? 'column'} is "${id}".`,
      });
    } else if (types && !types.includes(column.type)) {
      context.addIssue({
        code: 'custom',
        path,
        message: `${rule ?? rules.type} Column "${id}" is \`${column.type}\`.`,
      });
    } else if (single && column.multivalue) {
      context.addIssue({
        code: 'custom',
        path,
        message: `${rule ?? rules.single ?? rules.type} Column "${id}" is multivalue.`,
      });
    }
  }
};
