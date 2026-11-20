/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { EuiProvider, EuiThemeProvider, useEuiTheme } from '@elastic/eui';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { css, Global } from '@emotion/react';

import { AppHost } from './apps/app_host';
import { useAccent } from './chrome/accent';
import type { ColorModePreference } from './chrome/color_mode';
import { useColorMode } from './chrome/color_mode';
import { ConfigProblems } from './chrome/config_problems';
import { DEV_TINT } from './chrome/dev_tint';
import { StudioHeader } from './chrome/header';
import { NAV_WIDTH, StudioNav } from './chrome/nav';
import type { StudioRouter } from './chrome/route';
import {
  formatLocation,
  GALLERY,
  isAppRoute,
  isComposeRoute,
  isHomeRoute,
  useStudioRoute,
} from './chrome/route';
import { ShellBackdrop } from './chrome/shell_background';
import type { StudioApp } from './config';
import { ComposeView } from './dev/compose_view';
import { DevView } from './dev/dev_view';
import { DocsView } from './docs/docs_view';
import { GalleryView } from './docs/gallery_view';
import { HomeView } from './home/home_view';
import { createShim } from './model/compile_jsx';
import { composeExample, composeOf } from './model/compose_example';
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

/** Touch targets of at least 44px for the controls EUI draws smaller. */
const touchTargets = css`
  @media (pointer: coarse) {
    .euiButton,
    .euiButtonEmpty,
    .euiButtonIcon,
    .euiButtonGroupButton,
    .euiListGroupItem__button {
      min-block-size: 44px;
    }
    .euiButtonIcon {
      min-inline-size: 44px;
    }
  }
`;

const NO_APPS: readonly StudioApp[] = [];

const fill = css`
  height: 100%;
`;

const compactNavQuery = () =>
  typeof window === 'undefined'
    ? undefined
    : window.matchMedia(`(max-width: ${NAV_WIDTH.compactAt}px)`);

const phoneNavQuery = () =>
  typeof window === 'undefined'
    ? undefined
    : window.matchMedia(`(max-width: ${NAV_WIDTH.phoneAt}px)`);

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
    devRoute,
    composeParams,
    navigate,
    openApp,
    goHome,
    openComposer,
    replaceComposer,
  } = router;
  const { euiTheme } = useEuiTheme();
  const {
    apps,
    docs: { primitives },
  } = useStudio();
  const home = isHomeRoute(location);
  const app = isAppRoute(location)
    ? apps.find(({ id }) => id === location.app)
    : undefined;
  const { page } = route;
  const composing = isComposeRoute(location);
  const mode = app || home ? undefined : composing ? 'dev' : route.mode;
  const look = mode ?? 'docs';
  const accent = useAccent(look);
  const [isCompactNav, setCompactNav] = useState(
    () => compactNavQuery()?.matches ?? false
  );
  const [isNavOpen, setNavOpen] = useState(() => !isCompactNav);
  const [isPhone, setPhone] = useState(() => phoneNavQuery()?.matches ?? false);
  const navToggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const query = phoneNavQuery();
    if (!query) {
      return;
    }
    const update = () => setPhone(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

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
    position: relative;
    isolation: isolate;
    color: ${euiTheme.colors.textParagraph};
  `;
  const body = css`
    flex: 1;
    min-height: 0;
    display: grid;
    position: relative;
    grid-template-columns: ${
      isPhone
        ? 0
        : isCompactNav
          ? NAV_WIDTH.closed
          : isNavOpen
            ? NAV_WIDTH.open
            : NAV_WIDTH.closed
    }px minmax(0, 1fr);
    transition: grid-template-columns ${euiTheme.animation.normal}
      ${euiTheme.animation.resistance};
  `;
  const panel = css`
    min-height: 0;
    margin: 0 ${euiTheme.size.m} ${euiTheme.size.m};
    /* Contain absolute descendants (EUI screen-reader text) so they cannot overflow the shell. */
    position: relative;
    overflow: auto;
    border-radius: ${euiTheme.border.radius.frame};
    background: ${euiTheme.colors.backgroundBasePlain};
  `;
  const main = css`
    grid-column: 2;
    margin-left: 0;
  `;

  const closeOnPhone = useCallback(() => {
    if (isPhone) {
      setNavOpen(false);
    }
  }, [isPhone]);

  // Back and Forward change the page without going through the nav.
  const address = formatLocation(location);
  useEffect(() => closeOnPhone(), [address, closeOnPhone]);

  const onSelectPrimitive = useCallback(
    (type: string) => navigate({ page: type, example: 0 }),
    [navigate]
  );

  if (home) {
    return (
      <main
        css={css`
          height: 100vh;
          overflow: auto;
          color: ${euiTheme.colors.textParagraph};
          background: ${euiTheme.colors.backgroundBasePlain};
        `}>
        <ConfigProblems problems={configProblems} />
        <HomeView
          {...{
            title,
            onSelectPrimitive,
            colorMode,
            onColorModeChange,
            composeParams,
          }}
        />
      </main>
    );
  }

  return (
    <div css={shell}>
      <ShellBackdrop {...{ look }} />
      <EuiThemeProvider colorMode="dark" wrapperProps={darkWrapper}>
        <StudioHeader
          {...{
            title,
            mode,
            appTitle: app?.title,
            colorMode,
            onColorModeChange,
            onSelectPrimitive,
          }}
          onModeChange={(next) => navigate({ mode: next })}
          onHome={goHome}
          phoneNav={
            isPhone
              ? {
                  isOpen: isNavOpen,
                  onToggle: () => setNavOpen((open) => !open),
                  toggleRef: navToggle,
                }
              : undefined
          }
        />
      </EuiThemeProvider>
      <div css={body}>
        <EuiThemeProvider colorMode="dark" wrapperProps={darkWrapper}>
          <StudioNav
            {...{ page }}
            app={app?.id}
            isComposing={composing}
            // Reopens the draft the composer last wrote, so the URL keeps sharing it.
            onCompose={() => {
              openComposer(composeParams);
              closeOnPhone();
            }}
            appPath={isAppRoute(location) ? location.path : undefined}
            isOpen={isNavOpen}
            isCompact={isCompactNav}
            {...{ isPhone }}
            toggleRef={navToggle}
            onToggle={() => setNavOpen((open) => !open)}
            onClose={() => setNavOpen(false)}
            onSelect={(next) => {
              navigate(
                next === GALLERY
                  ? { mode: 'docs', page: GALLERY }
                  : { page: next, example: 0 }
              );
              closeOnPhone();
            }}
            onSelectApp={(id, path) => {
              openApp(id, path);
              closeOnPhone();
            }}
          />
        </EuiThemeProvider>
        <main css={[panel, main]}>
          <ConfigProblems problems={configProblems} />
          {app && isAppRoute(location) ? (
            <AppHost key={app.id} path={location.path} {...{ app, openApp }} />
          ) : null}
          {!primitives.length ? null : (
            <>
              {composeParams ? (
                <div hidden={!composing} css={fill}>
                  <ComposeView
                    params={composeParams}
                    stacked={isCompactNav}
                    {...{ openComposer, replaceComposer }}
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
        <Global styles={touchTargets} />
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
