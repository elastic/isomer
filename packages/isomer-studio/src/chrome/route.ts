/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { ComposeParams } from '../model/compose_link';
import { formatComposeQuery, parseComposeQuery } from '../model/compose_link';
import type { RuntimeDocs } from '../model/describe_runtime';

export type StudioMode = 'dev' | 'docs';

export interface StudioRoute {
  mode: StudioMode;
  /** A primitive `type`, or `gallery` in docs mode. */
  page: string;
  example: number;
  /** A group title the gallery scrolls to, from `#/docs/gallery/<group>`. */
  group?: string | undefined;
}

export interface AppRoute {
  app: string;
  /** Everything after `#/app/<id>/`, which may contain slashes. */
  path: string;
}

/** The landing page, at `#/home`, which an empty or unknown hash also opens. */
export interface HomeRoute {
  home: true;
}

/** The composition editor, at `#/compose`, with what to load in its query. */
export interface ComposeRoute {
  compose: true;
  params: ComposeParams;
}

export type StudioLocation = StudioRoute | AppRoute | HomeRoute | ComposeRoute;

export const GALLERY = 'gallery';

const APP_SEGMENT = 'app';
const HOME_SEGMENT = 'home';
const COMPOSE_SEGMENT = 'compose';

export const HOME: HomeRoute = { home: true };

/** A segment as written, when it is not valid percent-encoding. */
const decodeSegment = (segment: string): string => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

export const isAppRoute = (location: StudioLocation): location is AppRoute =>
  'app' in location;

export const isHomeRoute = (location: StudioLocation): location is HomeRoute =>
  'home' in location;

export const isComposeRoute = (
  location: StudioLocation
): location is ComposeRoute => 'compose' in location;

export const isPrimitiveRoute = (
  location: StudioLocation
): location is StudioRoute => 'mode' in location;

/** Reads `#/dev/callout/0`, `#/docs/statGroup`, `#/docs/gallery` or `#/docs/gallery/Text`, falling back to the first primitive. */
export const parseRoute = (
  hash: string,
  { primitives, groups }: RuntimeDocs
): StudioRoute => {
  const [mode, page, example] = hash.replace(/^#\/?/, '').split('/');
  const first = groups[0]?.types[0] ?? primitives[0]?.type ?? '';
  const resolvedMode: StudioMode = mode === 'docs' ? 'docs' : 'dev';
  const doc = primitives.find(({ type }) => type === page);
  const index = Number(example);

  if (!doc && resolvedMode === 'docs' && page === GALLERY) {
    const title = example === undefined ? undefined : decodeSegment(example);
    const group = groups.find((candidate) => candidate.title === title);
    return {
      mode: resolvedMode,
      page: GALLERY,
      example: 0,
      ...(group ? { group: group.title } : {}),
    };
  }

  return {
    mode: resolvedMode,
    page: doc ? doc.type : first,
    example:
      doc &&
      Number.isInteger(index) &&
      index >= 0 &&
      index < doc.examples.length
        ? index
        : 0,
  };
};

/**
 * {@link parseRoute} for `#/dev/...` and `#/docs/...`, `#/app/<id>/<path>` for an id in `appIds`,
 * `#/compose?<query>` for the composition editor, and {@link HOME} for an empty hash, `#/home`, an
 * unknown app, or any other first segment.
 */
export const parseLocation = (
  hash: string,
  docs: RuntimeDocs,
  appIds: readonly string[]
): StudioLocation => {
  const path = hash.replace(/^#\/?/, '');
  const query = path.indexOf('?');
  if (
    (query < 0 ? path : path.slice(0, query)).replace(/\/$/, '') ===
    COMPOSE_SEGMENT
  ) {
    return {
      compose: true,
      params: query < 0 ? {} : parseComposeQuery(path.slice(query + 1)),
    };
  }
  const [segment, id, ...rest] = path.split('/');
  if (segment === APP_SEGMENT) {
    return id !== undefined && appIds.includes(id)
      ? { app: id, path: rest.map(decodeSegment).join('/') }
      : HOME;
  }
  if (segment === 'dev' || segment === 'docs') {
    return parseRoute(hash, docs);
  }
  return HOME;
};

export const formatRoute = ({
  mode,
  page,
  example,
  group,
}: StudioRoute): string =>
  page === GALLERY
    ? group === undefined
      ? `#/${mode}/${GALLERY}`
      : `#/${mode}/${GALLERY}/${encodeURIComponent(group)}`
    : `#/${mode}/${page}/${example}`;

export const formatLocation = (location: StudioLocation): string =>
  isComposeRoute(location)
    ? `#/${COMPOSE_SEGMENT}${formatComposeQuery(location.params)}`
    : isHomeRoute(location)
      ? `#/${HOME_SEGMENT}`
      : isAppRoute(location)
        ? `#/${APP_SEGMENT}/${location.app}/${location.path.split('/').map(encodeURIComponent).join('/')}`
        : formatRoute(location);

export interface StudioRouter {
  location: StudioLocation;
  /** The current primitive route, or the last one before an app or Home opened. */
  route: StudioRoute;
  /** Moves to a primitive route, merging `next` into {@link StudioRouter.route}. */
  navigate: (next: Partial<StudioRoute>) => void;
  /** `path` is percent-encoded in the hash, segment by segment, and decoded when read back. */
  openApp: (id: string, path?: string) => void;
  /** Opens `#/home`. */
  goHome: () => void;
  /** Opens the composition editor, loading what `params` names. */
  openComposer: (params?: ComposeParams) => void;
  /**
   * Rewrites the composition editor's query in the URL, without a history entry, and leaves
   * {@link StudioRouter.location} alone so the editor does not reload what it wrote.
   */
  replaceComposer: (params: ComposeParams) => void;
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
    isPrimitiveRoute(location) ? location : parseRoute('', docs)
  );
  const current = useRef(route);
  current.current = route;
  const shown = useRef(location);
  shown.current = location;

  const show = useCallback((next: StudioLocation) => {
    setLocation(next);
    if (isPrimitiveRoute(next)) {
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
      const { mode, page, example } = current.current;
      const merged = { mode, page, example, ...next };
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

  const goHome = useCallback(() => go(HOME), [go]);

  const openComposer = useCallback(
    (params: ComposeParams = {}) => go({ compose: true, params }),
    [go]
  );

  const replaceComposer = useCallback((params: ComposeParams) => {
    const hash = formatLocation({ compose: true, params });
    if (isComposeRoute(shown.current) && window.location.hash !== hash) {
      window.history.replaceState(null, '', hash);
    }
  }, []);

  return {
    location,
    route,
    navigate,
    openApp,
    goHome,
    openComposer,
    replaceComposer,
  };
};
