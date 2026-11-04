/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, type ReactNode } from 'react';

import type { SvgChild, SvgElement } from './tree';

// React DOM names SVG presentation attributes in camel case; `aria-*` and
// `data-*` keep their dashes.
const reactName = (name: string) =>
  name.startsWith('aria-') || name.startsWith('data-')
    ? name
    : name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

export interface ReactDomOptions {
  /** Extra React props for an element, such as handlers; they win over its attributes. */
  readonly decorate?: (
    element: SvgElement
  ) => Readonly<Record<string, unknown>> | undefined;
  /** Elements appended to the root `svg`, drawn over everything else. */
  readonly overlay?: ReactNode;
}

const bind = (
  child: SvgChild,
  options: ReactDomOptions,
  key: number | undefined
): ReactNode => {
  if (typeof child === 'string') {
    return child;
  }
  const props: Record<string, unknown> = Object.fromEntries(
    Object.entries(child.attrs).map(([name, value]) => [reactName(name), value])
  );
  if (key !== undefined) {
    props.key = key;
  }
  if (child.tag === 'svg') {
    props.style = { maxWidth: '100%', height: 'auto', display: 'block' };
  }
  Object.assign(props, options.decorate?.(child));
  const children = child.children.map((grandchild, index) =>
    bind(grandchild, options, index)
  );
  return createElement(
    child.tag,
    props,
    ...children,
    ...(child.tag === 'svg' && options.overlay !== undefined
      ? [options.overlay]
      : [])
  );
};

/** Binds a drawing to React DOM elements. */
export const toReactDom = (
  child: SvgChild,
  options: ReactDomOptions = {}
): ReactNode => bind(child, options, undefined);
