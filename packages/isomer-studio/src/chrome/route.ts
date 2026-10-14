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

export interface AppRoute {
  app: string;
  /** Everything after `#/app/<id>/`, which may contain slashes. */
  path: string;
}

export type StudioLocation = StudioRoute | AppRoute;

export const GALLERY = 'gallery';

const APP_SEGMENT = 'app';

export const isAppRoute = (location: StudioLocation): location is AppRoute =>
  'app' in location;

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

/** {@link parseRoute}, plus `#/app/<id>/<path>` for an id in `appIds`. */
export const parseLocation = (
  hash: string,
  docs: RuntimeDocs,
  appIds: readonly string[]
): StudioLocation => {
  const [segment, id, ...rest] = hash.replace(/^#\/?/, '').split('/');
  return segment === APP_SEGMENT && id !== undefined && appIds.includes(id)
    ? { app: id, path: rest.join('/') }
    : parseRoute(hash, docs);
};

export const formatRoute = ({ mode, page, example }: StudioRoute): string =>
  page === GALLERY ? `#/${mode}/${GALLERY}` : `#/${mode}/${page}/${example}`;

export const formatLocation = (location: StudioLocation): string =>
  isAppRoute(location)
    ? `#/${APP_SEGMENT}/${location.app}/${location.path}`
    : formatRoute(location);

export interface StudioRouter {
  location: StudioLocation;
  /** The current primitive route, or the last one before an app opened. */
  route: StudioRoute;
  /** Moves to a primitive route, merging `next` into {@link StudioRouter.route}. */
  navigate: (next: Partial<StudioRoute>) => void;
  openApp: (id: string, path?: string) => void;
}

/** The location in the URL hash, re-checked whenever the primitives or apps change. */
export const useStudioRoute = (
  docs: RuntimeDocs,
  appIds: readonly string[]
): StudioRouter => {
  const appKey = appIds.join('/');
  const ids = useRef(appIds);
  ids.current = appIds;

  const [location, setLocation] = useState(() =>
    parseLocation(window.location.hash, docs, appIds)
  );
  const [route, setRoute] = useState(() =>
    isAppRoute(location) ? parseRoute('', docs) : location
  );
  const current = useRef(route);
  current.current = route;
  const shown = useRef(location);
  shown.current = location;

  const show = useCallback((next: StudioLocation) => {
    setLocation(next);
    if (!isAppRoute(next)) {
      setRoute(next);
    }
  }, []);

  useEffect(() => {
    const onHashChange = () =>
      show(parseLocation(window.location.hash, docs, ids.current));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [docs, show]);

  const checked = useRef({ docs, appKey });
  useEffect(() => {
    if (checked.current.docs === docs && checked.current.appKey === appKey) {
      return;
    }
    checked.current = { docs, appKey };
    const remembered = parseRoute(formatRoute(current.current), docs);
    if (formatRoute(remembered) !== formatRoute(current.current)) {
      setRoute(remembered);
    }
    const next = parseLocation(window.location.hash, docs, ids.current);
    const hash = formatLocation(next);
    if (hash === formatLocation(shown.current)) {
      return;
    }
    window.history.replaceState(null, '', hash);
    show(next);
  }, [docs, appKey, show]);

  const go = useCallback(
    (next: StudioLocation) => {
      const hash = formatLocation(next);
      if (window.location.hash !== hash) {
        window.history.pushState(null, '', hash);
      }
      show(next);
    },
    [show]
  );

  const navigate = useCallback(
    (next: Partial<StudioRoute>) => {
      const merged = { ...current.current, ...next };
      go(
        parseRoute(
          formatRoute(
            merged.mode === 'dev' && merged.page === GALLERY
              ? { ...merged, page: '' }
              : merged
          ),
          docs
        )
      );
    },
    [docs, go]
  );

  const openApp = useCallback(
    (id: string, path = '') => go({ app: id, path }),
    [go]
  );

  return { location, route, navigate, openApp };
};
