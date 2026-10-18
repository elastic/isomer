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
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import type { PrimitiveDoc } from '../model/describe_runtime';
import { useStudio } from '../studio_context';
import { ExamplePicker } from '../surfaces/example_picker';
import { SurfaceBoard } from '../surfaces/surface_board';
import type { SurfaceView } from '../surfaces/surface_preview';
import { SurfaceViewToggle } from '../surfaces/surface_preview';
import {
  previewSurfaces,
  surfaceNote,
  SurfaceSelect,
  useSurfaceSelection,
} from '../surfaces/surface_select';

import { ExampleSource } from './example_source';

export interface ExamplesPanelProps {
  doc: PrimitiveDoc;
  example: number;
  onExampleChange: (example: number) => void;
  devHref: string;
}

/** One example at a time, on one surface or all of them. */
export const ExamplesPanel = ({
  doc,
  example,
  onExampleChange,
  devHref,
}: ExamplesPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const { runtime, compose, rasterizePng } = useStudio();
  const { examples } = doc;
  const surfaces = previewSurfaces(doc.surfaces, Boolean(rasterizePng), true);
  const { showing, select } = useSurfaceSelection(
    surfaces,
    surfaces[0] ? [surfaces[0]] : 'all'
  );
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
  const bar = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.base};
  `;

  return (
    <EuiPanel paddingSize="none" hasShadow>
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        wrap
        css={css`
          ${bar};
          border-bottom: ${euiTheme.border.thin};
        `}>
        <EuiFlexItem grow={false}>
          <ExamplePicker
            {...{ examples, example }}
            onChange={onExampleChange}
          />
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <SurfaceSelect
            {...{ surfaces }}
            selected={showing}
            anchorPosition="downRight"
            onChange={select}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <div
        css={css`
          padding: ${euiTheme.size.l};
          background: ${euiTheme.colors.backgroundBaseSubdued};
        `}>
        <SurfaceBoard
          surfaces={showing}
          {...{ composition, validation, view }}
          zoom="fit"
        />
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
        wrap
        css={css`
          ${bar};
          border-top: ${euiTheme.border.thin};
        `}>
        <EuiFlexItem grow={false}>
          <SurfaceViewToggle
            {...{ view }}
            onChange={setView}
            legend="Example view"
          />
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            min-width: 0;
          `}>
          <EuiText size="xs" color="subdued">
            {surfaceNote(showing, surfaces.length)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            href={devHref}
            iconType="external"
            iconSide="right">
            Open in Dev
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      {selected ? <ExampleSource node={selected.node} /> : null}
    </EuiPanel>
  );
};
