/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, type ReactNode } from 'react';

import type { SvgChild } from './tree';

// React DOM names SVG presentation attributes in camel case; `aria-*` and
// `data-*` keep their dashes.
const reactName = (name: string) =>
  name.startsWith('aria-') || name.startsWith('data-')
    ? name
    : name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

/** Binds a drawing to React DOM elements. */
export const toReactDom = (child: SvgChild, key?: number): ReactNode => {
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
  return createElement(
    child.tag,
    props,
    ...child.children.map((grandchild, index) => toReactDom(grandchild, index))
  );
};
