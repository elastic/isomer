/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
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
import { GALLERY, isAppRoute, useStudioRoute } from './chrome/route';
import type { StudioApp } from './config';
import { DevView } from './dev/dev_view';
import { DocsView } from './docs/docs_view';
import { GalleryView } from './docs/gallery_view';
import { createShim } from './model/compile_jsx';
import { composeExample } from './model/compose_example';
import { describeRuntime } from './model/describe_runtime';
import type { StudioContextValue, StudioTheme } from './studio_context';
import { StudioContextProvider, useStudio } from './studio_context';
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

const Layout = ({
  title,
  router: { location, route, navigate, openApp },
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
  const { euiTheme } = useEuiTheme();
  const {
    apps,
    docs: { primitives },
  } = useStudio();
  const app = isAppRoute(location)
    ? apps.find(({ id }) => id === location.app)
    : undefined;
  const { page } = route;
  const mode = app ? undefined : route.mode;
  const look = mode ?? 'docs';
  const accent = useAccent(look);
  const [isNavOpen, setNavOpen] = useState(true);
  const [devRoute, setDevRoute] = useState(mode === 'dev' ? route : undefined);
  if (mode === 'dev' && devRoute !== route) {
    setDevRoute(route);
  }

  const shell = css`
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: ${euiTheme.colors.textParagraph};
    background-color: ${look === 'docs' ? '#0b2347' : '#0b3a2c'};
    background-image: ${look === 'docs' ? docsBackground : devBackground};
  `;
  const body = css`
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: ${isNavOpen ? NAV_WIDTH.open : NAV_WIDTH.closed}px minmax(
        0,
        1fr
      );
    transition: grid-template-columns ${euiTheme.animation.normal}
      ${euiTheme.animation.resistance};
  `;
  const main = css`
    min-height: 0;
    margin: 0 ${euiTheme.size.m} ${euiTheme.size.m} 0;
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
            accent,
            appTitle: app?.title,
            colorMode,
            onColorModeChange,
            onSelectPrimitive,
          }}
          onModeChange={(next) => navigate({ mode: next })}
        />
      </EuiThemeProvider>
      <div css={body}>
        <EuiThemeProvider colorMode="dark" wrapperProps={darkWrapper}>
          <StudioNav
            {...{ page }}
            mode={route.mode}
            app={app?.id}
            isOpen={isNavOpen}
            onToggle={() => setNavOpen((open) => !open)}
            onSelect={(next) => navigate({ page: next, example: 0 })}
            onSelectApp={(id) => openApp(id)}
          />
        </EuiThemeProvider>
        <main css={main}>
          {configProblems.length ? (
            <EuiCallOut
              announceOnMount
              color="danger"
              iconType="error"
              title="The config's apps are invalid; the Studio keeps the last valid apps">
              <ul>
                {configProblems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </EuiCallOut>
          ) : null}
          {app && isAppRoute(location) ? (
            <AppHost key={app.id} path={location.path} {...{ app, openApp }} />
          ) : null}
          {!primitives.length ? null : (
            <>
              {devRoute ? (
                <div hidden={mode !== 'dev'} css={fill}>
                  <DevView route={devRoute} {...{ navigate }} />
                </div>
              ) : null}
              {mode !== 'docs' ? null : page === GALLERY ? (
                <GalleryView />
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
  createReactContext,
  compose: composeNodes,
  transformJsx,
  rasterizePng,
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
  const compose = useCallback(
    (nodes: readonly PrimitiveNode[]) =>
      composeExample(composeNodes, nodes, theme),
    [composeNodes, theme]
  );

  const value = useMemo(
    (): StudioContextValue => ({
      runtime,
      apps,
      docs,
      shim,
      schemaFor,
      theme,
      compose,
      createReactContext,
      transformJsx,
      rasterizePng,
    }),
    [
      runtime,
      apps,
      docs,
      shim,
      schemaFor,
      theme,
      compose,
      createReactContext,
      transformJsx,
      rasterizePng,
    ]
  );

  return (
    <StudioContextProvider {...{ value }}>
      <EuiThemeProvider
        modify={
          !isAppRoute(router.location) && router.route.mode === 'dev'
            ? DEV_TINT
            : NO_TINT
        }
        wrapperProps={darkWrapper}>
        <Layout
          {...{ title, router, configProblems, colorMode, onColorModeChange }}
        />
      </EuiThemeProvider>
    </StudioContextProvider>
  );
};

/** A dev and docs shell for an Isomer runtime, built only from what the runtime reports. */
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
