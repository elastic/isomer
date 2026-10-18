/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
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
import {
  previewSurfaces,
  SurfaceSelect,
  useSurfaceSelection,
} from '../surfaces/surface_select';

import { ExampleSource } from './example_source';

type ExamplesView = SurfaceView | 'example';

const EXAMPLE_VIEW_OPTIONS: { id: ExamplesView; label: string }[] = [
  { id: 'example', label: 'Example source' },
  { id: 'render', label: 'Rendered' },
  { id: 'source', label: 'Output source' },
];

const isExamplesView = (id: string): id is ExamplesView =>
  id === 'render' || id === 'source' || id === 'example';

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
  const surfaces = previewSurfaces(doc.surfaces, Boolean(rasterizePng));
  const { showing, select } = useSurfaceSelection(
    surfaces,
    surfaces[0] ? [surfaces[0]] : 'all'
  );
  const [view, setView] = useState<ExamplesView>('render');
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
        hidden={view === 'example'}
        css={css`
          padding: ${euiTheme.size.l};
          background: ${euiTheme.colors.backgroundBaseSubdued};
        `}>
        <SurfaceBoard
          surfaces={showing}
          view={view === 'example' ? 'render' : view}
          {...{ composition, validation }}
          errorHref={devHref}
          zoom="fit"
        />
      </div>
      {selected ? (
        <ExampleSource node={selected.node} isOpen={view === 'example'} />
      ) : null}
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
          <EuiButtonGroup
            legend="Example view"
            buttonSize="s"
            variant="selection"
            idSelected={view}
            display="highlighted"
            onChange={(id) => isExamplesView(id) && setView(id)}>
            {EXAMPLE_VIEW_OPTIONS.map(({ id, label }) => (
              <EuiButton key={id} id={id}>
                {label}
              </EuiButton>
            ))}
          </EuiButtonGroup>
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            align-items: flex-end;
          `}>
          <EuiButtonEmpty
            size="s"
            href={devHref}
            iconType="external"
            iconSide="right">
            Open in Workbench
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
