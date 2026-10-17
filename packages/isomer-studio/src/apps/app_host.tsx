/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType, ReactNode } from 'react';
import React, {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { EuiButton, EuiCallOut, EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/react';

import type { StudioApp, StudioAppProps } from '../config';
import { useStudio } from '../studio_context';
import { AppPreview } from '../surfaces/app_preview';
import { AppSurface, appSurfaces } from '../surfaces/app_surface';

type AppPage = ComponentType<StudioAppProps>;

/** `version` counts the distinct pages resolved, so a new page also gets a fresh error boundary. */
type Loaded = { page: AppPage; version: number } | { error: Error } | undefined;

const asError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

/**
 * The page `load` resolves to, re-resolved whenever `load` changes. Every config re-run makes a new `load`, and
 * the page only changes, remounting the app, when the module's default export does.
 */
const useAppPage = (load: StudioApp['load'], attempt: number): Loaded => {
  const [loaded, setLoaded] = useState<Loaded>();
  const versions = useRef(0);
  useEffect(() => {
    let isCurrent = true;
    // A loader that throws before returning its promise fails like one that rejects.
    new Promise<Awaited<ReturnType<StudioApp['load']>>>((resolve) =>
      resolve(load())
    ).then(
      ({ default: page }) => {
        if (isCurrent) {
          setLoaded((previous) =>
            previous && 'page' in previous && previous.page === page
              ? previous
              : { page, version: (versions.current += 1) }
          );
        }
      },
      (error: unknown) => {
        if (isCurrent) {
          setLoaded({ error: asError(error) });
        }
      }
    );
    return () => {
      isCurrent = false;
    };
  }, [load, attempt]);
  return loaded;
};

interface BoundaryState {
  error?: Error | undefined;
}

const AppError = ({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: Error;
  onRetry: () => void;
}) => (
  <EuiCallOut
    announceOnMount
    color="danger"
    iconType="error"
    title={`${title} could not load or render`}>
    <p>{error.message}</p>
    <EuiButton size="s" color="danger" onClick={onRetry}>
      Retry
    </EuiButton>
  </EuiCallOut>
);

class AppBoundary extends Component<
  { title: string; onRetry: () => void; children: ReactNode },
  BoundaryState
> {
  state: BoundaryState = {};

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  render() {
    const { error } = this.state;
    const { title, onRetry, children } = this.props;
    return error === undefined ? (
      children
    ) : (
      <AppError {...{ title, error, onRetry }} />
    );
  }
}

const fill = css`
  min-height: 100%;
`;

const centered = css`
  display: flex;
  justify-content: center;
  padding: 48px;
`;

/** Loads and renders the open app; it stays mounted across sub-path navigation, theme changes and config re-runs. */
export const AppHost = ({
  app: { id, title, load },
  path,
  openApp,
}: {
  app: StudioApp;
  path: string;
  openApp: (id: string, path: string) => void;
}) => {
  const { runtime, theme, rasterizePng, renderPdf } = useStudio();
  const surfaces = useMemo(
    () => appSurfaces(runtime, Boolean(rasterizePng)),
    [runtime, rasterizePng]
  );
  const [attempt, setAttempt] = useState(0);
  const loaded = useAppPage(load, attempt);
  const navigate = useCallback(
    (next: string) => openApp(id, next),
    [id, openApp]
  );
  const onRetry = useCallback(() => setAttempt((count) => count + 1), []);

  if (loaded === undefined) {
    return (
      <div css={centered}>
        <EuiLoadingSpinner size="xl" />
      </div>
    );
  }
  if ('error' in loaded) {
    return <AppError {...{ title, onRetry }} error={loaded.error} />;
  }
  const { page: Page, version } = loaded;
  return (
    <div css={fill}>
      <AppBoundary key={`${version}/${attempt}`} {...{ title, onRetry }}>
        <Page
          Preview={AppPreview}
          Surface={AppSurface}
          {...{ runtime, theme, path, navigate, surfaces }}
          {...(renderPdf ? { renderPdf } : {})}
        />
      </AppBoundary>
    </div>
  );
};
