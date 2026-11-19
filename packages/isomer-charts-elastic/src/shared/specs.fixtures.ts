/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Children, isValidElement, type ReactNode } from 'react';

export const specElements = (specs: ReactNode) => {
  const fragment = specs as { props: { children: ReactNode } };
  return Children.toArray(fragment.props.children).flatMap((child) =>
    isValidElement<Record<string, unknown>>(child) ? [child.props] : []
  );
};

/** The `id` of every spec element, in the order `sceneSpecs` returns them. */
export const specIds = (specs: ReactNode): string[] =>
  specElements(specs).flatMap(({ id }) => (typeof id === 'string' ? [id] : []));
