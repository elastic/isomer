/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiProvider, EuiThemeProvider, useEuiTheme } from '@elastic/eui';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { css } from '@emotion/react';

import { useAccent } from './chrome/accent';
import type { ColorModePreference } from './chrome/color_mode';
import { useColorMode } from './chrome/color_mode';
import { StudioHeader } from './chrome/header';
import { NAV_WIDTH, StudioNav } from './chrome/nav';
import type { StudioRoute } from './chrome/route';
import { GALLERY, useStudioRoute } from './chrome/route';
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

const Layout = ({
  title,
  route,
  navigate,
  colorMode,
  onColorModeChange,
}: {
  title?: string | undefined;
  route: StudioRoute;
  navigate: (next: Partial<StudioRoute>) => void;
  colorMode: ColorModePreference;
  onColorModeChange: (colorMode: ColorModePreference) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const {
    docs: { primitives },
  } = useStudio();
  const { mode, page } = route;
  const accent = useAccent(mode);
  const [isNavOpen, setNavOpen] = useState(true);

  const shell = css`
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: ${euiTheme.colors.backgroundBasePlain};
    color: ${euiTheme.colors.textParagraph};
  `;
  const body = css`
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: ${isNavOpen ? NAV_WIDTH.open : NAV_WIDTH.closed}px minmax(
        0,
        1fr
      );
    background: ${accent.shell};
    transition:
      grid-template-columns ${euiTheme.animation.normal}
        ${euiTheme.animation.resistance},
      background ${euiTheme.animation.normal} ${euiTheme.animation.resistance};
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
            {...{ mode, page, accent }}
            isOpen={isNavOpen}
            onToggle={() => setNavOpen((open) => !open)}
            onSelect={(next) => navigate({ page: next, example: 0 })}
          />
        </EuiThemeProvider>
        <main css={main}>
          {!primitives.length ? null : mode === 'dev' ? (
            <DevView {...{ route, navigate, accent }} />
          ) : page === GALLERY ? (
            <GalleryView />
          ) : (
            <DocsView {...{ route, navigate }} />
          )}
        </main>
      </div>
    </div>
  );
};

const Studio = ({
  title,
  runtime,
  createReactContext,
  compose: composeNodes,
  transformJsx,
  rasterizePng,
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
  const [route, navigate] = useStudioRoute(docs);
  const compose = useCallback(
    (nodes: readonly PrimitiveNode[]) =>
      composeExample(composeNodes, nodes, theme),
    [composeNodes, theme]
  );

  const value = useMemo(
    (): StudioContextValue => ({
      runtime,
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
      <Layout {...{ title, route, navigate, colorMode, onColorModeChange }} />
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
