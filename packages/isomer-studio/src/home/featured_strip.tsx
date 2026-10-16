/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { PrimitiveGlyph } from '../chrome/primitive_glyph';
import { formatRoute, GALLERY } from '../chrome/route';
import type { PrimitiveDoc } from '../model/describe_runtime';

import {
  helpTile,
  HOME,
  HOME_NARROW,
  sectionLabel,
  tile,
  TILE_COLUMNS,
  tileActions,
  tileDescription,
  tileName,
  tileTop,
} from './tokens';

const GAP = 12;

export interface FeaturedStripProps {
  featured: readonly PrimitiveDoc[];
  /** How many primitives the runtime has, for the closing tile. */
  total: number;
}

const PrimitiveTile = ({ doc }: { doc: PrimitiveDoc }) => {
  const {
    euiTheme: { font },
  } = useEuiTheme();
  const { type, label, group, purpose } = doc;
  return (
    <div
      css={[
        tile(4),
        css`
          scroll-snap-align: start;
          &:hover,
          &:focus-within {
            border-color: rgba(240, 78, 152, 0.75);
          }
          cursor: default;
        `,
      ]}
      data-testid="featured-primitive">
      <span css={tileTop}>
        <span css={tileName}>{label}</span>
        <span
          css={css`
            color: ${HOME.accent};
            margin-top: 1px;
          `}>
          <PrimitiveGlyph {...{ type }} size={18} />
        </span>
      </span>
      <span
        css={css`
          font-family: ${font.familyCode};
          font-size: 11px;
          color: ${HOME.fg};
        `}>
        {group}
      </span>
      <span css={tileDescription}>{purpose}</span>
      <span css={tileActions}>
        <a
          href={formatRoute({ mode: 'docs', page: type, example: 0 })}
          css={css`
            color: ${HOME.docs};
            cursor: pointer;
          `}>
          Docs →
        </a>
        <a
          href={formatRoute({ mode: 'dev', page: type, example: 0 })}
          css={css`
            color: ${HOME.dev};
          `}>
          Dev →
        </a>
      </span>
    </div>
  );
};

/**
 * The featured primitives in a recessed well, a row at a time, paged by the buttons or scrolled, ending on
 * a tile that opens the gallery.
 */
export const FeaturedStrip = ({ featured, total }: FeaturedStripProps) => {
  const strip = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const sync = useCallback(() => {
    const element = strip.current;
    if (!element) {
      return;
    }
    setEdges({
      start: element.scrollLeft <= 1,
      end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, [sync, featured]);

  const page = (direction: -1 | 1) => {
    const element = strip.current;
    const first = element?.firstElementChild;
    if (!element || !first) {
      return;
    }
    const step = first.getBoundingClientRect().width + GAP;
    const perPage = Math.max(1, Math.round((element.clientWidth + GAP) / step));
    element.scrollBy({ left: direction * step * perPage, behavior: 'smooth' });
  };

  const well = css`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px 16px;
    margin-inline: -16px;
    border-radius: 12px;
    box-sizing: border-box;
    background: rgba(0, 0, 0, 0.18);
    box-shadow:
      inset 0 1px 0 rgba(0, 0, 0, 0.25),
      inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  `;
  const pager = css`
    background-color: ${HOME.surface3};
    border-color: ${HOME.line3};
    color: ${HOME.fg};
    &:disabled {
      background-color: ${HOME.surface1};
      border-color: ${HOME.line1};
      color: ${HOME.fg3};
    }
  `;
  const tiles = css`
    display: grid;
    grid-template-rows: repeat(4, auto);
    grid-auto-flow: column;
    grid-auto-columns: calc(
      (100% - ${GAP}px * (var(${TILE_COLUMNS}, 3) - 1)) /
        var(${TILE_COLUMNS}, 3)
    );
    gap: ${GAP}px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    padding: 3px;
    margin: -3px;
    scroll-padding: 3px;
    &::-webkit-scrollbar {
      display: none;
    }
    ${HOME_NARROW} {
      grid-auto-flow: row;
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: none;
      grid-auto-columns: auto;
      overflow-x: visible;
      scroll-snap-type: none;
    }
  `;

  return (
    <section css={well} aria-labelledby="isomer-studio-featured">
      <div css={sectionLabel}>
        <span id="isomer-studio-featured">Featured primitives</span>
        <span
          css={css`
            display: flex;
            gap: 6px;
            ${HOME_NARROW} {
              display: none;
            }
          `}>
          <EuiButtonIcon
            iconType="chevronSingleLeft"
            size="xs"
            color="text"
            display="base"
            css={pager}
            aria-label="Previous primitives"
            isDisabled={edges.start}
            onClick={() => page(-1)}
          />
          <EuiButtonIcon
            iconType="chevronSingleRight"
            size="xs"
            color="text"
            display="base"
            css={pager}
            aria-label="Next primitives"
            isDisabled={edges.end}
            onClick={() => page(1)}
          />
        </span>
      </div>
      <div ref={strip} css={tiles} onScroll={sync}>
        {featured.map((doc) => (
          <PrimitiveTile key={doc.type} {...{ doc }} />
        ))}
        <a
          href={formatRoute({ mode: 'docs', page: GALLERY, example: 0 })}
          css={[
            helpTile(4, HOME.docs),
            css`
              scroll-snap-align: start;
            `,
          ]}>
          <span
            css={css`
              font-size: 28px;
              font-weight: 600;
              line-height: 1;
              color: ${HOME.fg};
              font-variant-numeric: tabular-nums;
            `}>
            {total}
          </span>
          <span css={tileDescription}>
            {total === 1 ? 'primitive' : 'primitives'} in this Studio
          </span>
          <span
            css={css`
              font-size: 12px;
              font-weight: 600;
              color: ${HOME.docs};
            `}>
            Open the gallery →
          </span>
        </a>
      </div>
    </section>
  );
};
