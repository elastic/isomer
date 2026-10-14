/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType, LazyExoticComponent, ReactNode } from 'react';
import React, { Component, lazy, Suspense, useCallback, useState } from 'react';
import { EuiButton, EuiCallOut, EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/react';

import type { StudioApp, StudioAppProps } from '../config';
import { useStudio } from '../studio_context';
import { AppPreview } from '../surfaces/app_preview';

type LazyApp = LazyExoticComponent<ComponentType<StudioAppProps>>;

const lazyApps = new Map<string, LazyApp>();

/** Every config re-run makes a new `load`, so apps are told apart by source; Vite stamps HMR'd imports with `?t=`. */
const appKey = ({ id, load }: StudioApp): string =>
  `${id}\n${String(load).replace(/[?&]t=\d+/g, '')}`;

const lazyApp = (app: StudioApp): LazyApp => {
  const key = appKey(app);
  let found = lazyApps.get(key);
  if (!found) {
    found = lazy(app.load);
    lazyApps.set(key, found);
  }
  return found;
};

interface BoundaryState {
  error?: Error | undefined;
}

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
  app,
  path,
  openApp,
}: {
  app: StudioApp;
  path: string;
  openApp: (id: string, path: string) => void;
}) => {
  const { runtime, theme } = useStudio();
  const { id, title } = app;
  const [attempt, setAttempt] = useState(0);
  const App = lazyApp(app);
  const navigate = useCallback(
    (next: string) => openApp(id, next),
    [id, openApp]
  );
  const onRetry = useCallback(() => {
    lazyApps.delete(appKey(app));
    setAttempt((count) => count + 1);
  }, [app]);

  return (
    <div css={fill}>
      <AppBoundary key={`${appKey(app)}\n${attempt}`} {...{ title, onRetry }}>
        <Suspense
          fallback={
            <div css={centered}>
              <EuiLoadingSpinner size="xl" />
            </div>
          }>
          <App Preview={AppPreview} {...{ runtime, theme, path, navigate }} />
        </Suspense>
      </AppBoundary>
    </div>
  );
};
