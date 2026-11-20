/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiCallOut,
  EuiLink,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { Composition, ValidationResult } from '@elastic/isomer-sdk';
import type { SerializedStyles } from '@emotion/react';
import { css } from '@emotion/react';

import type { StudioSurface } from '../model/describe_runtime';
import { SURFACE_CATALOG } from '../model/surface_catalog';
import { useStudio } from '../studio_context';

import { ShadowHtmlSurface } from './html_surface';
import { ReactSurface } from './react_surface';
import type { SurfaceOutput } from './render_output';
import { renderSurfaceOutput } from './render_output';
import type { PreviewZoom } from './scaled_preview';
import { ScaledPreview } from './scaled_preview';
import { blockKitBuilderUrl, SlackSurface } from './slack_surface';
import { SnapshotSurface } from './snapshot_surface';
import { SurfaceFrame } from './surface_frame';
import { MarkdownSurface, SourceView, TextSurface } from './text_surfaces';

export type SurfaceView = 'render' | 'source';

export const VIEW_OPTIONS: readonly { id: SurfaceView; label: string }[] = [
  { id: 'render', label: 'Rendered' },
  { id: 'source', label: 'Output source' },
];

const isSurfaceView = (id: string): id is SurfaceView =>
  id === 'render' || id === 'source';

/** Switches a surface between its rendered form and its source. */
export const SurfaceViewToggle = ({
  view,
  onChange,
  legend,
}: {
  view: SurfaceView;
  onChange: (view: SurfaceView) => void;
  legend: string;
}) => (
  <EuiButtonGroup
    {...{ legend }}
    buttonSize="s"
    variant="selection"
    idSelected={view}
    display="highlighted"
    onChange={(id) => isSurfaceView(id) && onChange(id)}>
    {VIEW_OPTIONS.map(({ id, label }) => (
      <EuiButton key={id} id={id}>
        {label}
      </EuiButton>
    ))}
  </EuiButtonGroup>
);

/** Pads surfaces that draw bare text to the inset a pack's boxed content (a callout) has. */
const Inset = ({
  children,
  isBottomFlush,
}: {
  children: ReactNode;
  isBottomFlush?: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const { m } = euiTheme.size;

  return (
    <div
      css={css`
        padding: ${m} ${m} ${isBottomFlush ? 0 : m};
      `}>
      {children}
    </div>
  );
};

const Rendered = ({
  surface,
  composition,
  output,
  zoom,
  heading,
  enhancements,
}: {
  surface: StudioSurface;
  composition: Composition;
  output: SurfaceOutput;
  zoom: PreviewZoom;
  heading: boolean | undefined;
  enhancements?: readonly string[] | undefined;
}) => {
  const { source, slack, snapshot } = output;
  switch (surface) {
    case 'react':
      return (
        <ScaledPreview {...{ zoom }}>
          <ReactSurface {...{ composition, heading, enhancements }} />
        </ScaledPreview>
      );
    case 'html':
      return (
        <ScaledPreview {...{ zoom }}>
          <ShadowHtmlSurface
            html={source}
            title={`${SURFACE_CATALOG.html.label} preview`}
            enhancementScript={output.enhancementScript}
          />
        </ScaledPreview>
      );
    case 'markdown':
      return (
        <Inset isBottomFlush>
          <MarkdownSurface markdown={source} />
        </Inset>
      );
    case 'text':
      return (
        <Inset>
          <TextSurface text={source} />
        </Inset>
      );
    case 'slack':
      return slack ? <SlackSurface blocks={slack.blocks} /> : null;
    case 'snapshot':
      return snapshot ? (
        <ScaledPreview {...{ zoom }}>
          <SnapshotSurface html={snapshot.html} stylesheet={snapshot.css} />
        </ScaledPreview>
      ) : null;
  }
};

export interface SurfacePreviewProps {
  surface: StudioSurface;
  composition: Composition;
  validation: ValidationResult;
  view: SurfaceView;
  /** Scales the `react`, `html` and `snapshot` renders. Defaults to `fit`. */
  zoom?: PreviewZoom;
  /** Styles a frame around the render or source alone; diagnostics sit below it. */
  frameCss?: SerializedStyles | undefined;
  /** A relevant recovery destination when rendering fails. */
  errorHref?: string | undefined;
  /** `false` leaves out the composition's leading title. Defaults to `true`. */
  heading?: boolean | undefined;
  /** Runs the requested enhancements on React or shadow-DOM HTML previews. */
  enhancements?: readonly string[] | undefined;
}

/** One surface's render or source, with what it reported. */
export const SurfacePreview = ({
  surface,
  composition,
  validation,
  view,
  zoom = 'fit',
  frameCss,
  errorHref,
  heading,
  enhancements,
}: SurfacePreviewProps) => {
  const { runtime } = useStudio();
  const output = useMemo(
    () =>
      renderSurfaceOutput(runtime, surface, composition, validation, {
        heading,
        enhancements,
      }),
    [runtime, surface, composition, validation, heading, enhancements]
  );
  const { error, warnings, slack } = output;

  return (
    <>
      {error ? (
        <EuiCallOut
          announceOnMount
          size="s"
          color="danger"
          iconType="error"
          title="This surface could not render"
          text={
            <>
              <p>{error}</p>
              {errorHref ? (
                <EuiLink href={errorHref}>
                  Open this example in Workbench
                </EuiLink>
              ) : null}
            </>
          }
        />
      ) : (
        <SurfaceFrame {...{ frameCss }}>
          {view === 'source' ? (
            <>
              <SourceView {...{ output }} />
              {slack ? (
                <EuiText size="s">
                  <EuiSpacer size="xs" />
                  <EuiLink
                    href={blockKitBuilderUrl(slack.blocks)}
                    target="_blank"
                    external>
                    Open in Block Kit Builder
                  </EuiLink>
                </EuiText>
              ) : null}
            </>
          ) : (
            <Rendered
              {...{ surface, composition, output, zoom, heading, enhancements }}
            />
          )}
        </SurfaceFrame>
      )}
      {warnings.length ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            size="s"
            color="warning"
            iconType="warning"
            title={`${SURFACE_CATALOG[surface].label} warnings`}>
            <ul>
              {warnings.map(({ path, message }) => (
                <li key={`${path}:${message}`}>
                  {path ? `${path}: ${message}` : message}
                </li>
              ))}
            </ul>
          </EuiCallOut>
        </>
      ) : null}
    </>
  );
};
