/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { RuntimeDocs } from '../model/describe_runtime';

export type StudioMode = 'dev' | 'docs';

export interface StudioRoute {
  mode: StudioMode;
  /** A primitive `type`, or `gallery` in docs mode. */
  page: string;
  example: number;
}

export const GALLERY = 'gallery';

/** Reads `#/dev/callout/0`, `#/docs/statGroup` or `#/docs/gallery`, falling back to the first primitive. */
export const parseRoute = (
  hash: string,
  { primitives, groups }: RuntimeDocs
): StudioRoute => {
  const [mode, page, example] = hash.replace(/^#\/?/, '').split('/');
  const first = groups[0]?.types[0] ?? primitives[0]?.type ?? '';
  const resolvedMode: StudioMode = mode === 'docs' ? 'docs' : 'dev';
  const doc = primitives.find(({ type }) => type === page);
  const index = Number(example);

  return {
    mode: resolvedMode,
    page: doc
      ? doc.type
      : resolvedMode === 'docs' && page === GALLERY
        ? GALLERY
        : first,
    example:
      doc &&
      Number.isInteger(index) &&
      index >= 0 &&
      index < doc.examples.length
        ? index
        : 0,
  };
};

export const formatRoute = ({ mode, page, example }: StudioRoute): string =>
  page === GALLERY ? `#/${mode}/${GALLERY}` : `#/${mode}/${page}/${example}`;

/** The route in the URL hash, and a navigator that writes it back. */
export const useStudioRoute = (
  docs: RuntimeDocs
): [StudioRoute, (next: Partial<StudioRoute>) => void] => {
  const [route, setRoute] = useState(() =>
    parseRoute(window.location.hash, docs)
  );
  const current = useRef(route);
  current.current = route;

  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute(window.location.hash, docs));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [docs]);

  const navigate = useCallback(
    (next: Partial<StudioRoute>) => {
      const merged = { ...current.current, ...next };
      const resolved = parseRoute(
        formatRoute(
          merged.mode === 'dev' && merged.page === GALLERY
            ? { ...merged, page: '' }
            : merged
        ),
        docs
      );
      const hash = formatRoute(resolved);
      if (window.location.hash !== hash) {
        window.history.pushState(null, '', hash);
      }
      setRoute(resolved);
    },
    [docs]
  );

  return [route, navigate];
};
