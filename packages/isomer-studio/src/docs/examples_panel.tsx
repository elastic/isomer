/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiTab,
  EuiTabs,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import type { PrimitiveDoc, StudioSurface } from '../model/describe_runtime';
import { SURFACE_LABELS } from '../model/describe_runtime';
import { useStudio } from '../studio_context';
import { ExamplePicker } from '../surfaces/example_picker';
import type { SurfaceView } from '../surfaces/surface_preview';
import {
  SURFACE_ICONS,
  SurfacePreview,
  SurfaceViewToggle,
} from '../surfaces/surface_preview';

export interface ExamplesPanelProps {
  doc: PrimitiveDoc;
  example: number;
  onExampleChange: (example: number) => void;
  devHref: string;
}

/** One example at a time, on one surface at a time. */
export const ExamplesPanel = ({
  doc,
  example,
  onExampleChange,
  devHref,
}: ExamplesPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const { runtime, compose } = useStudio();
  const { examples, surfaces } = doc;
  const [surface, setSurface] = useState<StudioSurface>(surfaces[0] ?? 'react');
  const [view, setView] = useState<SurfaceView>('render');
  const selected = examples[example];

  const composition = useMemo(
    () => compose(selected ? [selected.node] : []),
    [compose, selected]
  );
  const validation = useMemo(
    () => runtime.validate(composition),
    [runtime, composition]
  );

  return (
    <EuiPanel paddingSize="none" hasShadow>
      <EuiTabs
        size="s"
        css={css`
          padding: 0 ${euiTheme.size.m};
        `}>
        {surfaces.map((candidate) => (
          <EuiTab
            key={candidate}
            isSelected={candidate === surface}
            onClick={() => setSurface(candidate)}
            prepend={
              <EuiIcon
                type={SURFACE_ICONS[candidate]}
                size="s"
                aria-hidden={true}
              />
            }>
            {SURFACE_LABELS[candidate]}
          </EuiTab>
        ))}
      </EuiTabs>
      <div
        css={css`
          padding: ${euiTheme.size.l};
          background: ${euiTheme.colors.backgroundBaseSubdued};
        `}>
        <SurfacePreview {...{ surface, composition, validation, view }} />
      </div>
      {selected?.description ? (
        <EuiText
          size="s"
          color="subdued"
          css={css`
            padding: ${euiTheme.size.s} ${euiTheme.size.base} 0;
          `}>
          <p>{selected.description}</p>
        </EuiText>
      ) : null}
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        css={css`
          padding: ${euiTheme.size.s} ${euiTheme.size.base};
          border-top: ${euiTheme.border.thin};
        `}>
        <EuiFlexItem grow={false}>
          <ExamplePicker
            {...{ examples, example }}
            onChange={onExampleChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SurfaceViewToggle
            {...{ view }}
            onChange={setView}
            legend="Example view"
          />
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="s" href={devHref} iconType="code">
            Open in Dev
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
