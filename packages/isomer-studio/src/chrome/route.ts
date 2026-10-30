/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import type { ComposeParams } from '../model/compose_link';
import { formatComposeQuery, parseComposeQuery } from '../model/compose_link';
import type { RuntimeDocs } from '../model/describe_runtime';
import { createStore } from '../model/store';

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

/** What the Studio shows, and what each page it keeps mounted last showed. */
export interface Navigation {
  location: StudioLocation;
  /** The current primitive route, or the last one before an app, Home or the composer opened. */
  route: StudioRoute;
  /** The last primitive route shown in dev mode, which the Workbench keeps while other pages show. */
  devRoute?: StudioRoute | undefined;
  /**
   * What the composer shows: the link it last opened, or the draft it last wrote. Opening the
   * same query again keeps these, so an in-flight load is not restarted. Unset until it opens.
   */
  composeParams?: ComposeParams | undefined;
}

/** `state` once it shows `location`. */
export const showLocation = (
  state: Navigation,
  location: StudioLocation
): Navigation => {
  const { composeParams } = state;
  const primitive = isPrimitiveRoute(location) ? location : undefined;
  return {
    location,
    route: primitive ?? state.route,
    devRoute: primitive?.mode === 'dev' ? primitive : state.devRoute,
    composeParams:
      isComposeRoute(location) &&
      (!composeParams ||
        formatComposeQuery(location.params) !==
          formatComposeQuery(composeParams))
        ? location.params
        : composeParams,
  };
};

export interface StudioRouter extends Navigation {
  /** Moves to a primitive route, merging `next` into {@link Navigation.route}. */
  navigate: (next: Partial<StudioRoute>) => void;
  /** `path` is percent-encoded in the hash, segment by segment, and decoded when read back. */
  openApp: (id: string, path?: string) => void;
  /** Opens `#/home`. */
  goHome: () => void;
  /** Opens the composition editor, loading what `params` names. */
  openComposer: (params?: ComposeParams) => void;
  /**
   * Records what the composer wrote as {@link Navigation.composeParams}, and rewrites the URL's
   * query to it, without a history entry, while the composer shows.
   */
  replaceComposer: (params: ComposeParams) => void;
}

/** The location in the URL hash, re-checked whenever the primitives or apps change. */
export const useStudioRoute = (
  docs: RuntimeDocs,
  appIds: readonly string[]
): StudioRouter => {
  const [store] = useState(() => {
    const location = parseLocation(window.location.hash, docs, appIds);
    const route = isPrimitiveRoute(location) ? location : parseRoute('', docs);
    return createStore(showLocation({ location, route }, location));
  });
  const navigation = useSyncExternalStore(store.subscribe, store.get);

  useEffect(() => {
    const show = (location: StudioLocation) =>
      store.set(showLocation(store.get(), location));
    const { location, route } = store.get();
    const remembered = parseRoute(formatRoute(route), docs);
    if (formatRoute(remembered) !== formatRoute(route)) {
      store.set({ ...store.get(), route: remembered });
    }
    const next = parseLocation(window.location.hash, docs, appIds);
    if (formatLocation(next) !== formatLocation(location)) {
      window.history.replaceState(null, '', formatLocation(next));
      show(next);
    }
    const onHashChange = () =>
      show(parseLocation(window.location.hash, docs, appIds));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [docs, appIds, store]);

  const actions = useMemo(() => {
    const go = (next: StudioLocation) => {
      const hash = formatLocation(next);
      if (window.location.hash !== hash) {
        window.history.pushState(null, '', hash);
      }
      store.set(showLocation(store.get(), next));
    };
    return {
      navigate: (next: Partial<StudioRoute>) => {
        const { mode, page, example } = store.get().route;
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
      openApp: (id: string, path = '') => go({ app: id, path }),
      goHome: () => go(HOME),
      openComposer: (params: ComposeParams = {}) =>
        go({ compose: true, params }),
    };
  }, [docs, store]);

  // A composer flushing as the whole Studio unmounts must not rewrite another page's URL. The
  // Studio's effects clean up before its composer's.
  const unmounted = useRef(false);
  useEffect(
    () => () => {
      unmounted.current = true;
    },
    []
  );
  const replaceComposer = useCallback(
    (params: ComposeParams) => {
      if (unmounted.current) {
        return;
      }
      const state = store.get();
      store.set({ ...state, composeParams: params });
      const hash = formatLocation({ compose: true, params });
      if (isComposeRoute(state.location) && window.location.hash !== hash) {
        window.history.replaceState(null, '', hash);
      }
    },
    [store]
  );

  return { ...navigation, ...actions, replaceComposer };
};
