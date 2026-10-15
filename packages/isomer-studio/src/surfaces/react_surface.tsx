/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { Component, useLayoutEffect, useMemo } from 'react';
import { EuiCallOut } from '@elastic/eui';
import type { Composition, StyledRenderContext } from '@elastic/isomer-sdk';

import { useStudio } from '../studio_context';

import { HtmlSurface } from './html_surface';
import { ShadowRootHost } from './shadow_root';

interface BoundaryState {
  error?: Error | undefined;
}

/** Keeps a renderer that throws on a half-edited node from taking the Studio down. */
class RenderBoundary extends Component<
  { children: ReactNode; resetKey: unknown },
  BoundaryState
> {
  state: BoundaryState = {};

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidUpdate({ resetKey }: { resetKey: unknown }) {
    if (resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: undefined });
    }
  }

  render() {
    const { error } = this.state;
    return error ? (
      <EuiCallOut
        announceOnMount
        size="s"
        color="danger"
        iconType="error"
        title="The React renderer threw"
        text={<p>{error.message}</p>}
      />
    ) : (
      this.props.children
    );
  }
}

export interface ReactSurfaceProps {
  composition: Composition;
  enhancements?: readonly string[] | undefined;
  /** Runs after each commit of the shadow root's content; the `html` fallback has no root to hand it. */
  onCommit?: ((root: ShadowRoot) => void) | undefined;
}

const ReactContent = ({
  root,
  composition,
  enhancements,
  onCommit,
  createReactContext,
}: ReactSurfaceProps & {
  root: ShadowRoot;
  createReactContext: (root: ShadowRoot) => StyledRenderContext;
}) => {
  const { runtime } = useStudio();
  const context = useMemo(
    () => createReactContext(root),
    [createReactContext, root]
  );
  useLayoutEffect(() => {
    onCommit?.(root);
  });
  return (
    <>
      {runtime.surfaces.react.render(composition, {
        wrapper: true,
        context,
        ...(enhancements ? { enhancements } : {}),
      })}
    </>
  );
};

const HtmlContent = ({
  composition,
  enhancements,
}: Pick<ReactSurfaceProps, 'composition' | 'enhancements'>) => {
  const { runtime } = useStudio();
  const { html } = runtime.surfaces.html.render(composition, {
    scripts: 'host',
    ...(enhancements ? { enhancements } : {}),
  });
  return <HtmlSurface {...{ html }} title="React preview" />;
};

/** The React surface in a shadow root, styled by the host, or the `html` surface when it supplies no styling. */
export const ReactSurface = ({
  composition,
  enhancements,
  onCommit,
}: ReactSurfaceProps) => {
  const { createReactContext } = useStudio();

  return (
    <RenderBoundary resetKey={composition}>
      {createReactContext ? (
        <ShadowRootHost>
          {(root) => (
            <ReactContent
              {...{
                root,
                composition,
                enhancements,
                onCommit,
                createReactContext,
              }}
            />
          )}
        </ShadowRootHost>
      ) : (
        <HtmlContent {...{ composition, enhancements }} />
      )}
    </RenderBoundary>
  );
};
