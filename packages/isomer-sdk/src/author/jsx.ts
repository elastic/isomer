/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Brand carrying the primitive type an authoring component stands for.
 *
 * `Symbol.for` rather than `Symbol()`: the SDK ships both ESM and CJS builds,
 * so a host can hold two copies of this module and a unique symbol would make
 * one build's components unreadable to the other's shim.
 */
export const authorType = Symbol.for('elastic.isomer.author_type');

/**
 * A JSX component that renders `null` and exists only to carry `TType` through
 * the tree until the shim converts it to a composition.
 */
export interface AuthorComponent<TProps, TType extends string> {
  (props: TProps): null;
  readonly [authorType]: TType;
  /** Set to `type` by {@link defineAuthorComponent}; a pack does not need to supply it. */
  displayName?: string;
}

/** The {@link AuthorComponent} for one primitive `type`. */
export const defineAuthorComponent = <TProps, TType extends string>(
  type: TType
): AuthorComponent<TProps, TType> =>
  Object.assign(() => null, {
    [authorType]: type,
    displayName: type,
  });
