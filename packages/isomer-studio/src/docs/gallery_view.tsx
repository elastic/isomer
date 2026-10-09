/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { Composition } from '@elastic/isomer-sdk';
import { css } from '@emotion/react';

import { formatRoute } from '../chrome/route';
import type { PrimitiveDoc } from '../model/describe_runtime';
import { useStudio } from '../studio_context';
import { ReactSurface } from '../surfaces/react_surface';
import { ScaledPreview } from '../surfaces/scaled_preview';

/** Columns in the gallery grid. That many previews mount immediately. */
export const GALLERY_COLUMNS = 3;

/** How far ahead of the viewport a preview mounts. */
const PREVIEW_ROOT_MARGIN = '240px';

/** 16:9 matches a 1920×1080 slide, so later rows stay outside the first paint. */
const previewWell = css`
  aspect-ratio: 16 / 9;
`;

const DeferredPreview = ({
  eager,
  children,
}: {
  eager: boolean;
  children: ReactNode;
}) => {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    if (visible) {
      return;
    }
    const element = host.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some(({ isIntersecting }) => isIntersecting)) {
          observer.disconnect();
          setVisible(true);
        }
      },
      { rootMargin: PREVIEW_ROOT_MARGIN }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  return <div ref={host}>{visible ? children : <div css={previewWell} />}</div>;
};

const ExampleTile = ({
  doc: { label },
  name,
  composition,
  devHref,
  eager,
}: {
  doc: PrimitiveDoc;
  name: string;
  composition: Composition;
  devHref: string;
  eager: boolean;
}) => (
  <EuiPanel hasBorder hasShadow={false} paddingSize="m">
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem>
        <EuiText size="xs">
          <strong>{label}</strong> · {name}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <EuiLink href={devHref} aria-label={`Open ${label} ${name} in Dev`}>
            Open in Dev
          </EuiLink>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="s" />
    <DeferredPreview {...{ eager }}>
      <ScaledPreview>
        <ReactSurface {...{ composition }} />
      </ScaledPreview>
    </DeferredPreview>
  </EuiPanel>
);

/** Every example of every primitive on the React surface, by group. */
export const GalleryView = () => {
  const { euiTheme } = useEuiTheme();
  const {
    docs: { primitives, groups },
    compose,
  } = useStudio();

  const compositions = useMemo(
    () =>
      new Map(
        primitives.map(({ type, examples }) => [
          type,
          examples.map(({ node }) => compose([node])),
        ])
      ),
    [primitives, compose]
  );

  let rendered = 0;

  return (
    <div
      css={css`
        max-width: 1080px;
        margin-inline: auto;
        padding: ${euiTheme.size.xl} ${euiTheme.size.xxl} ${euiTheme.size.xxxxl};
      `}>
      <EuiTitle size="l">
        <h1>Gallery</h1>
      </EuiTitle>
      {groups.map(({ title, types }) => (
        <React.Fragment key={title}>
          <EuiSpacer size="l" />
          <EuiTitle size="s">
            <h2>{title}</h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFlexGrid columns={GALLERY_COLUMNS} gutterSize="m">
            {types.flatMap((type) => {
              const doc = primitives.find(
                (candidate) => candidate.type === type
              );
              return doc
                ? doc.examples.map(({ name }, index) => {
                    const eager = rendered < GALLERY_COLUMNS;
                    rendered += 1;
                    return (
                      <ExampleTile
                        key={`${type}/${index}`}
                        {...{ doc, name, eager }}
                        composition={
                          compositions.get(type)?.[index] ?? compose([])
                        }
                        devHref={formatRoute({
                          mode: 'dev',
                          page: type,
                          example: index,
                        })}
                      />
                    );
                  })
                : [];
            })}
          </EuiFlexGrid>
        </React.Fragment>
      ))}
    </div>
  );
};
