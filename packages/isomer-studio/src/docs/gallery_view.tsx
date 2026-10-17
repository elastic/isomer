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

import {
  CONTENT_BASIS,
  OnThisPage,
  PAGE_WIDTH,
  TOC_GAP,
  useActiveEntry,
} from './on_this_page';

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

/** A heading id the Home page's category chips can scroll to. */
export const galleryGroupId = (title: string): string =>
  `isomer-studio-gallery-${encodeURIComponent(title)}`;

/** Every example of every primitive on the React surface, by group, beside an "On this page" gutter; `group` scrolls to that group. */
export const GalleryView = ({ group }: { group?: string | undefined }) => {
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

  useEffect(() => {
    if (group === undefined) {
      return;
    }
    document
      .getElementById(galleryGroupId(group))
      ?.scrollIntoView({ block: 'start' });
  }, [group]);

  const entries = useMemo(
    () => groups.map(({ title }) => ({ id: galleryGroupId(title), title })),
    [groups]
  );
  const ids = useMemo(() => entries.map(({ id }) => id), [entries]);
  const [active, setActive] = useActiveEntry(ids, '');

  let rendered = 0;

  return (
    <div
      css={css`
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: ${TOC_GAP}px;
        max-width: ${PAGE_WIDTH}px;
        margin-inline: auto;
        padding: ${euiTheme.size.xl} ${euiTheme.size.xxl} ${euiTheme.size.xxxxl};
      `}>
      <div
        css={css`
          flex: 1 1 ${CONTENT_BASIS}px;
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.l};
          min-width: 0;
        `}>
        <EuiTitle size="l">
          <h1>Gallery</h1>
        </EuiTitle>
        {groups.map(({ title, types }) => (
          <section
            key={title}
            id={galleryGroupId(title)}
            aria-label={title}
            css={css`
              display: flex;
              flex-direction: column;
              gap: ${euiTheme.size.m};
              scroll-margin-top: ${euiTheme.size.l};
            `}>
            <EuiTitle size="s">
              <h2>{title}</h2>
            </EuiTitle>
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
          </section>
        ))}
      </div>
      <OnThisPage {...{ entries, active }} onSelect={setActive} />
    </div>
  );
};
