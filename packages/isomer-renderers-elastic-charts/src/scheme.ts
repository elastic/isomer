/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type RefObject, useEffect, useState } from 'react';
import type { Scheme } from '@elastic/isomer-primitives-charts/model';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** The host's `color-scheme` at `element`, falling back to the OS preference. */
const schemeAt = (element: Element): Scheme => {
  const declared = getComputedStyle(element).colorScheme.split(/\s+/);
  const dark = declared.includes('dark');
  if (dark !== declared.includes('light')) {
    return dark ? 'dark' : 'light';
  }
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
};

/** `element` and its ancestors, continuing through shadow hosts. */
export const ancestors = (element: Element): Element[] => {
  const { parentElement, parentNode } = element;
  const parent =
    parentElement ??
    (parentNode instanceof ShadowRoot ? parentNode.host : undefined);
  return parent ? [element, ...ancestors(parent)] : [element];
};

/**
 * The scheme the chart paints in: `fixed` when given, else the host's, followed
 * across OS changes and attribute changes on the element or its ancestors,
 * shadow hosts included.
 * `undefined` until mounted, so server markup never guesses.
 */
export const useScheme = (
  ref: RefObject<Element | null>,
  fixed?: Scheme
): Scheme | undefined => {
  const [host, setHost] = useState<Scheme | undefined>();
  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    if (fixed !== undefined) {
      setHost(fixed);
      return;
    }
    const update = () => setHost(schemeAt(element));
    update();
    const media = window.matchMedia(DARK_QUERY);
    media.addEventListener('change', update);
    const observer = new MutationObserver(update);
    for (const node of ancestors(element)) {
      observer.observe(node, { attributes: true });
    }
    return () => {
      media.removeEventListener('change', update);
      observer.disconnect();
    };
  }, [ref, fixed]);
  return host === undefined ? undefined : (fixed ?? host);
};
