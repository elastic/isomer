/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { Component, useMemo } from 'react';
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

const ReactContent = ({
  root,
  composition,
  createReactContext,
}: {
  root: ShadowRoot;
  composition: Composition;
  createReactContext: (root: ShadowRoot) => StyledRenderContext;
}) => {
  const { runtime } = useStudio();
  const context = useMemo(
    () => createReactContext(root),
    [createReactContext, root]
  );
  return (
    <>
      {runtime.surfaces.react.render(composition, { wrapper: true, context })}
    </>
  );
};

const HtmlContent = ({ composition }: { composition: Composition }) => {
  const { runtime } = useStudio();
  const { html } = runtime.surfaces.html.render(composition, {
    scripts: 'host',
  });
  return <HtmlSurface {...{ html }} title="React preview" />;
};

/** The React surface in a shadow root, styled by the host, or the `html` surface when it supplies no styling. */
export const ReactSurface = ({ composition }: { composition: Composition }) => {
  const { createReactContext } = useStudio();

  return (
    <RenderBoundary resetKey={composition}>
      {createReactContext ? (
        <ShadowRootHost>
          {(root) => (
            <ReactContent {...{ root, composition, createReactContext }} />
          )}
        </ShadowRootHost>
      ) : (
        <HtmlContent {...{ composition }} />
      )}
    </RenderBoundary>
  );
};
