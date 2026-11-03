/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, Walker } from '@elastic/esql';

/** Why {@link queryParams} found no parameter list a host can bind by name. */
export type QueryParamsRefusal = 'syntax' | 'unnamed' | 'positional';

/** What {@link queryParams} found. */
export type QueryParams =
  | { readonly ok: true; readonly names: string[] }
  | {
      readonly ok: false;
      readonly reason: QueryParamsRefusal;
      readonly message: string;
    };

/**
 * The named parameters (`?name`, `??name`) an ES|QL query references, in first-use order, found as Kibana finds them: `Parser.parse` and `Walker.params`.
 * Kibana binds parameters by name only, so a query with a syntax error, an anonymous `?` or a positional `?1` is refused.
 */
export const queryParams = (esql: string): QueryParams => {
  const { root, errors } = Parser.parse(esql);
  const [error] = errors;
  if (error) {
    return { ok: false, reason: 'syntax', message: error.message };
  }
  const names = new Set<string>();
  for (const { paramType, value, text } of Walker.params(root)) {
    if (paramType !== 'named') {
      return {
        ok: false,
        reason: paramType === 'positional' ? 'positional' : 'unnamed',
        message: `Parameter \`${text}\` is ${paramType}, and only named parameters can be bound.`,
      };
    }
    names.add(String(value));
  }
  return { ok: true, names: [...names] };
};
