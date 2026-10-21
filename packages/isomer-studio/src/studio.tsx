/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiCallOut,
  EuiProvider,
  EuiThemeProvider,
  useEuiTheme,
} from '@elastic/eui';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { css } from '@emotion/react';

import { AppHost } from './apps/app_host';
import { useAccent } from './chrome/accent';
import type { ColorModePreference } from './chrome/color_mode';
import { useColorMode } from './chrome/color_mode';
import { DEV_TINT } from './chrome/dev_tint';
import { StudioHeader } from './chrome/header';
import { NAV_WIDTH, StudioNav } from './chrome/nav';
import type { StudioRouter } from './chrome/route';
import {
  GALLERY,
  isAppRoute,
  isComposeRoute,
  isHomeRoute,
  useStudioRoute,
} from './chrome/route';
import type { StudioApp } from './config';
import { ComposeView } from './dev/compose_view';
import { DevView } from './dev/dev_view';
import { DocsView } from './docs/docs_view';
import { GalleryView } from './docs/gallery_view';
import { HomeView } from './home/home_view';
import { homeBackground } from './home/tokens';
import { createShim } from './model/compile_jsx';
import { composeExample, composeOf } from './model/compose_example';
import type { ComposeParams } from './model/compose_link';
import { formatComposeQuery } from './model/compose_link';
import { describeRuntime } from './model/describe_runtime';
import type { StudioContextValue, StudioTheme } from './studio_context';
import { StudioContextProvider, useStudio } from './studio_context';
import { reactContextOf } from './surfaces/adopt_stylesheet';
import type { IsomerStudioProps } from './types';

const darkWrapper = {
  css: css`
    display: contents;
  `,
};

const NO_TINT = {};

const NO_APPS: readonly StudioApp[] = [];

const fill = css`
  height: 100%;
`;

const docsBackground = css`
  background-color: #0b2347;
  background-image:
    radial-gradient(circle at 0% 0%, rgba(27, 169, 245, 0.3), transparent 24%),
    radial-gradient(
      circle at 4% 100%,
      rgba(240, 78, 152, 0.2),
      transparent 22%
    ),
    radial-gradient(circle at 40% 0%, rgba(0, 191, 179, 0.14), transparent 18%);
`;
const devBackground = css`
  background-color: #0b3a2c;
  background-image:
    radial-gradient(circle at 0% 0%, rgba(0, 191, 179, 0.3), transparent 24%),
    radial-gradient(
      circle at 4% 100%,
      rgba(254, 197, 20, 0.2),
      transparent 22%
    ),
    radial-gradient(circle at 40% 0%, rgba(27, 169, 245, 0.14), transparent 18%);
`;

type Look = 'dev' | 'docs' | 'home';

const compactNavQuery = () =>
  typeof window === 'undefined'
    ? undefined
    : window.matchMedia(`(max-width: ${NAV_WIDTH.compactAt}px)`);

const BACKGROUNDS = {
  dev: devBackground,
  docs: docsBackground,
  home: homeBackground,
} as const;

const Layout = ({
  title = 'Isomer Studio',
  router,
  configProblems = [],
  colorMode,
  onColorModeChange,
}: {
  title?: string | undefined;
  router: StudioRouter;
  configProblems?: readonly string[] | undefined;
  colorMode: ColorModePreference;
  onColorModeChange: (colorMode: ColorModePreference) => void;
}) => {
  const {
    location,
    route,
    navigate,
    openApp,
    goHome,
    openComposer,
    replaceComposer,
  } = router;
  const { euiTheme } = useEuiTheme();
  const {
    apps,
    featured,
    docs: { primitives },
  } = useStudio();
  const home = isHomeRoute(location);
  const app = isAppRoute(location)
    ? apps.find(({ id }) => id === location.app)
    : undefined;
  const { page } = route;
  const composing = isComposeRoute(location);
  const mode = app || home ? undefined : composing ? 'dev' : route.mode;
  const look: Look = home ? 'home' : (mode ?? 'docs');
  const accent = useAccent(look === 'home' ? 'docs' : look);
  const [isCompactNav, setCompactNav] = useState(
    () => compactNavQuery()?.matches ?? false
  );
  const [isNavOpen, setNavOpen] = useState(() => !isCompactNav);
  const [devRoute, setDevRoute] = useState(
    mode === 'dev' && !composing ? route : undefined
  );
  if (mode === 'dev' && !composing && devRoute !== route) {
    setDevRoute(route);
  }
  // The composer's params follow the route when it changes, then what the composer last wrote,
  // so a composer remounted after Home reloads the latest draft rather than the link it opened.
  const routeParams = composing ? location.params : undefined;
  const [seenParams, setSeenParams] = useState(routeParams);
  const [composeParams, setComposeParams] = useState(routeParams);
  if (routeParams && routeParams !== seenParams) {
    setSeenParams(routeParams);
    // The same query again, as from re-clicking Composition, keeps the composer's params, so an
    // in-flight load is not restarted.
    if (
      !composeParams ||
      formatComposeQuery(routeParams) !== formatComposeQuery(composeParams)
    ) {
      setComposeParams(routeParams);
    }
  }
  const replaceComposerParams = useCallback(
    (params: ComposeParams) => {
      setComposeParams(params);
      replaceComposer(params);
    },
    [replaceComposer]
  );

  useEffect(() => {
    const query = compactNavQuery();
    if (!query) {
      return;
    }
    const update = () => {
      setCompactNav(query.matches);
      setNavOpen(!query.matches);
    };
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const shell = css`
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: ${euiTheme.colors.textParagraph};
    ${BACKGROUNDS[look]};
  `;
  const body = css`
    flex: 1;
    min-height: 0;
    display: grid;
    position: relative;
    grid-template-columns: ${
      isCompactNav
        ? NAV_WIDTH.closed
        : isNavOpen
          ? NAV_WIDTH.open
          : NAV_WIDTH.closed
    }px minmax(0, 1fr);
    transition: grid-template-columns ${euiTheme.animation.normal}
      ${euiTheme.animation.resistance};
  `;
  const main = css`
    grid-column: 2;
    min-height: 0;
    margin: 0 ${euiTheme.size.m} ${euiTheme.size.m} 0;
    /* Contain absolute descendants (EUI screen-reader text) so they cannot overflow the shell. */
    position: relative;
    overflow: auto;
    border-radius: ${euiTheme.border.radius.frame};
    background: ${euiTheme.colors.backgroundBasePlain};
  `;

  const onSelectPrimitive = useCallback(
    (type: string) => navigate({ page: type, example: 0 }),
    [navigate]
  );

  return (
    <div css={shell}>
      <EuiThemeProvider colorMode="dark" wrapperProps={darkWrapper}>
        <StudioHeader
          {...{
            title,
            mode,
            home,
            appTitle: app?.title,
            colorMode,
            onColorModeChange,
            onSelectPrimitive,
          }}
          onModeChange={(next) => navigate({ mode: next })}
          onHome={goHome}
        />
      </EuiThemeProvider>
      {home ? (
        <EuiThemeProvider colorMode="dark" wrapperProps={darkWrapper}>
          <HomeView
            {...{ title, featured, configProblems }}
            router={{ route, navigate }}
          />
        </EuiThemeProvider>
      ) : (
        <div css={body}>
          <EuiThemeProvider colorMode="dark" wrapperProps={darkWrapper}>
            <StudioNav
              {...{ page }}
              mode={mode ?? route.mode}
              app={app?.id}
              isComposing={composing}
              // Reopens the draft the composer last wrote, so the URL keeps sharing it.
              onCompose={() => openComposer(composeParams)}
              appPath={isAppRoute(location) ? location.path : undefined}
              isOpen={isNavOpen}
              isCompact={isCompactNav}
              onToggle={() => setNavOpen((open) => !open)}
              onSelect={(next) =>
                navigate(
                  next === GALLERY
                    ? { mode: 'docs', page: GALLERY }
                    : { page: next, example: 0 }
                )
              }
              onSelectApp={openApp}
            />
          </EuiThemeProvider>
          <main css={main}>
            {configProblems.length ? (
              <EuiCallOut
                announceOnMount
                color="danger"
                iconType="error"
                title="The config is invalid; the Studio keeps the last valid one">
                <ul>
                  {configProblems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              </EuiCallOut>
            ) : null}
            {app && isAppRoute(location) ? (
              <AppHost
                key={app.id}
                path={location.path}
                {...{ app, openApp }}
              />
            ) : null}
            {!primitives.length ? null : (
              <>
                {composeParams ? (
                  <div hidden={!composing} css={fill}>
                    <ComposeView
                      params={composeParams}
                      isVisible={composing}
                      stacked={isCompactNav}
                      {...{ openComposer }}
                      replaceComposer={replaceComposerParams}
                    />
                  </div>
                ) : null}
                {devRoute ? (
                  <div hidden={mode !== 'dev' || composing} css={fill}>
                    <DevView
                      route={devRoute}
                      stacked={isCompactNav}
                      {...{ navigate, openComposer }}
                    />
                  </div>
                ) : null}
                {mode !== 'docs' ? null : page === GALLERY ? (
                  <GalleryView group={route.group} />
                ) : (
                  <DocsView {...{ route, navigate, accent }} />
                )}
              </>
            )}
          </main>
        </div>
      )}
    </div>
  );
};

const Studio = ({
  title,
  runtime,
  apps = NO_APPS,
  featured,
  createReactContext: configReactContext,
  stylesheet,
  compose: configCompose,
  previewExample,
  transformJsx,
  rasterizePng,
  renderPdf,
  configProblems,
  theme,
  colorMode,
  onColorModeChange,
}: IsomerStudioProps & {
  theme: StudioTheme;
  colorMode: ColorModePreference;
  onColorModeChange: (colorMode: ColorModePreference) => void;
}) => {
  const docs = useMemo(() => describeRuntime(runtime), [runtime]);
  const shim = useMemo(() => createShim(runtime.primitives), [runtime]);
  const schemaFor = useCallback(
    (type: string) =>
      runtime.primitives.find((definition) => definition.type === type)?.schema,
    [runtime]
  );
  const appIds = useMemo(() => apps.map(({ id }) => id), [apps]);
  const router = useStudioRoute(docs, appIds);
  const composeNodes = useMemo(
    () => composeOf({ compose: configCompose, previewExample }),
    [configCompose, previewExample]
  );
  const compose = useCallback(
    (nodes: readonly PrimitiveNode[]) =>
      composeExample(composeNodes, nodes, theme),
    [composeNodes, theme]
  );
  const createReactContext = useMemo(
    () =>
      reactContextOf({ createReactContext: configReactContext, stylesheet }),
    [configReactContext, stylesheet]
  );

  const value = useMemo(
    (): StudioContextValue => ({
      runtime,
      apps,
      featured,
      docs,
      shim,
      schemaFor,
      theme,
      compose,
      createReactContext,
      transformJsx,
      rasterizePng,
      renderPdf,
    }),
    [
      runtime,
      apps,
      featured,
      docs,
      shim,
      schemaFor,
      theme,
      compose,
      createReactContext,
      transformJsx,
      rasterizePng,
      renderPdf,
    ]
  );

  const { location } = router;
  const tinted =
    isComposeRoute(location) ||
    (!isAppRoute(location) &&
      !isHomeRoute(location) &&
      router.route.mode === 'dev');

  return (
    <StudioContextProvider {...{ value }}>
      <EuiThemeProvider
        modify={tinted ? DEV_TINT : NO_TINT}
        wrapperProps={darkWrapper}>
        <Layout
          {...{ title, router, configProblems, colorMode, onColorModeChange }}
        />
      </EuiThemeProvider>
    </StudioContextProvider>
  );
};

/** A home, dev and docs shell for an Isomer runtime, built only from what the runtime reports. */
export const IsomerStudio = (props: IsomerStudioProps) => {
  const {
    preference: colorMode,
    theme,
    setPreference: onColorModeChange,
  } = useColorMode();

  return (
    <EuiProvider colorMode={theme}>
      <Studio {...props} {...{ theme, colorMode, onColorModeChange }} />
    </EuiProvider>
  );
};
