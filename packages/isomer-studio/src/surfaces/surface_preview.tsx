/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import type { IconType } from '@elastic/eui';
import {
  EuiButtonGroup,
  EuiCallOut,
  EuiLink,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { Composition, ValidationResult } from '@elastic/isomer-sdk';
import { css } from '@emotion/react';

import type { StudioSurface } from '../model/describe_runtime';
import { SURFACE_LABELS } from '../model/describe_runtime';
import { useStudio } from '../studio_context';

import { HtmlSurface } from './html_surface';
import { ReactSurface } from './react_surface';
import type { SurfaceOutput } from './render_output';
import { renderSurfaceOutput } from './render_output';
import type { PreviewZoom } from './scaled_preview';
import { ScaledPreview } from './scaled_preview';
import { blockKitBuilderUrl, SlackSurface } from './slack_surface';
import { SnapshotSurface } from './snapshot_surface';
import { MarkdownLogo, ReactLogo, SnapshotLogo } from './surface_logos';
import { MarkdownSurface, SourceView, TextSurface } from './text_surfaces';

export type SurfaceView = 'render' | 'source';

export const SURFACE_ICONS: Readonly<Record<StudioSurface, IconType>> = {
  react: ReactLogo,
  html: 'code',
  snapshot: SnapshotLogo,
  markdown: MarkdownLogo,
  text: 'text',
  slack: 'logoSlack',
};

const VIEW_OPTIONS = [
  { id: 'render', label: 'Render', iconType: 'eye' },
  { id: 'source', label: 'Source', iconType: 'code' },
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
    legend={legend}
    options={VIEW_OPTIONS}
    idSelected={view}
    onChange={(id) => isSurfaceView(id) && onChange(id)}
    buttonSize="compressed"
    isIconOnly
  />
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
}: {
  surface: StudioSurface;
  composition: Composition;
  output: SurfaceOutput;
  zoom: PreviewZoom;
}) => {
  const { source, slack, snapshot } = output;
  switch (surface) {
    case 'react':
      return (
        <ScaledPreview {...{ zoom }}>
          <ReactSurface {...{ composition }} />
        </ScaledPreview>
      );
    case 'html':
      return (
        <ScaledPreview {...{ zoom }}>
          <HtmlSurface html={source} title={`${SURFACE_LABELS.html} preview`} />
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
      return slack ? (
        <Inset>
          <SlackSurface blocks={slack.blocks} />
        </Inset>
      ) : null;
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
}

/** One surface's render or source, with what it reported. */
export const SurfacePreview = ({
  surface,
  composition,
  validation,
  view,
  zoom = 'fit',
}: SurfacePreviewProps) => {
  const { runtime } = useStudio();
  const output = useMemo(
    () => renderSurfaceOutput(runtime, surface, composition, validation),
    [runtime, surface, composition, validation]
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
          text={<p>{error}</p>}
        />
      ) : view === 'source' ? (
        <>
          <SourceView {...{ output }} />
          {slack ? (
            <EuiText size="xs">
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
        <Rendered {...{ surface, composition, output, zoom }} />
      )}
      {warnings.length ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            size="s"
            color="warning"
            iconType="warning"
            title={`${SURFACE_LABELS[surface]} warnings`}>
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
