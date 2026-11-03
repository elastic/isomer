/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EuiButtonIcon, transparentize } from '@elastic/eui';
import { css } from '@emotion/react';

import { PrimitiveGlyph } from '../chrome/primitive_glyph';
import { formatRoute, GALLERY } from '../chrome/route';
import type { PrimitiveDoc } from '../model/describe_runtime';

import { HOME_NARROW, TILE_COLUMNS, useHome } from './tokens';

const STACKED_PAGE_SIZE = 3;

export interface FeaturedStripProps {
  featured: readonly PrimitiveDoc[];
  /** How many primitives the runtime has, for the closing tile. */
  total: number;
}

const PrimitiveTile = ({ doc }: { doc: PrimitiveDoc }) => {
  const home = useHome();
  const {
    euiTheme: { font },
    color,
    fontSize,
  } = home;
  const { type, label, group, purpose } = doc;
  return (
    <div
      css={[
        home.tile(4),
        home.actionCard,
        css`
          scroll-snap-align: start;
          &:hover,
          &:focus-within {
            border-color: ${color.accentBorder};
          }
          cursor: default;
        `,
      ]}
      data-testid="featured-primitive">
      <span css={home.tileTop}>
        <span css={home.tileName}>{label}</span>
        <span
          css={css`
            color: ${color.accent};
          `}>
          <PrimitiveGlyph {...{ type }} size={18} />
        </span>
      </span>
      <span
        css={css`
          font-family: ${font.familyCode};
          font-size: ${fontSize('xxs')};
          color: ${color.heading};
        `}>
        {group}
      </span>
      <span css={home.tileDescription}>{purpose}</span>
      <span css={home.tileActions}>
        <a
          href={formatRoute({ mode: 'docs', page: type, example: 0 })}
          css={css`
            color: ${color.docs};
            cursor: pointer;
          `}>
          Reference →
        </a>
        <a
          href={formatRoute({ mode: 'dev', page: type, example: 0 })}
          css={css`
            color: ${color.dev};
          `}>
          Workbench →
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
  const home = useHome();
  const {
    euiTheme: { size, border, colors, font },
    color,
    fontSize,
  } = home;
  const gap = parseFloat(size.m);
  const strip = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const [stacked, setStacked] = useState(false);
  const [stackedPage, setStackedPage] = useState(0);
  const lastStackedPage = Math.floor(featured.length / STACKED_PAGE_SIZE);
  const currentStackedPage = Math.min(stackedPage, lastStackedPage);
  const firstStackedTile = currentStackedPage * STACKED_PAGE_SIZE;

  const sync = useCallback(() => {
    const element = strip.current;
    if (!element) {
      return;
    }
    setStacked(getComputedStyle(element).gridAutoFlow === 'row');
    setEdges({
      start: element.scrollLeft <= 1,
      end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    sync();
    const element = strip.current;
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(sync);
    if (element) {
      observer?.observe(element);
    }
    window.addEventListener('resize', sync);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [sync, featured]);

  const page = (direction: -1 | 1) => {
    if (stacked) {
      setStackedPage(
        Math.max(0, Math.min(currentStackedPage + direction, lastStackedPage))
      );
      return;
    }
    const element = strip.current;
    const first = element?.firstElementChild;
    if (!element || !first) {
      return;
    }
    const step = first.getBoundingClientRect().width + gap;
    const perPage = Math.max(1, Math.round((element.clientWidth + gap) / step));
    element.scrollBy({
      left: direction * step * perPage,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  };

  const well = css`
    display: flex;
    flex-direction: column;
    gap: ${size.s};
    padding: ${size.m} ${size.base} ${size.base};
    margin-inline: -${size.base};
    border-radius: ${border.radius.panel};
    box-sizing: border-box;
    background: ${transparentize(colors.plainDark, 0.18)};
    box-shadow: inset 0 0 0 ${border.width.thin} ${color.surface};
  `;
  const tiles = css`
    display: grid;
    grid-template-rows: repeat(4, auto);
    grid-auto-flow: column;
    grid-auto-columns: calc(
      (100% - ${size.m} * (var(${TILE_COLUMNS}, 3) - 1)) /
        var(${TILE_COLUMNS}, 3)
    );
    gap: ${size.m};
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    padding: ${size.xs};
    margin: -${size.xs};
    scroll-padding: ${size.xs};
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
      > :nth-child(-n + ${firstStackedTile}),
      > :nth-child(n + ${firstStackedTile + STACKED_PAGE_SIZE + 1}) {
        display: none;
      }
    }
  `;

  return (
    <section css={well} aria-labelledby="isomer-studio-featured">
      <div css={home.sectionLabel}>
        <h2 id="isomer-studio-featured" css={home.sectionHeading}>
          Featured primitives
        </h2>
        <span
          css={css`
            display: flex;
            gap: ${size.xs};
          `}>
          <EuiButtonIcon
            iconType="chevronSingleLeft"
            size="xs"
            color="text"
            display="base"
            aria-label="Previous primitives"
            isDisabled={stacked ? currentStackedPage === 0 : edges.start}
            onClick={() => page(-1)}
          />
          <EuiButtonIcon
            iconType="chevronSingleRight"
            size="xs"
            color="text"
            display="base"
            aria-label="Next primitives"
            isDisabled={
              stacked ? currentStackedPage === lastStackedPage : edges.end
            }
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
            home.helpTile(4, color.docs),
            home.actionCard,
            css`
              scroll-snap-align: start;
            `,
          ]}>
          <span
            css={css`
              font-size: ${fontSize('xxl')};
              font-weight: ${font.weight.bold};
              line-height: 1;
              color: ${color.heading};
              font-variant-numeric: tabular-nums;
            `}>
            {total}
          </span>
          <span css={home.tileDescription}>
            {total === 1 ? 'primitive' : 'primitives'} in this Studio
          </span>
          <span
            css={css`
              font-size: ${fontSize('xs')};
              font-weight: ${font.weight.bold};
              color: ${color.docs};
            `}>
            Open the gallery →
          </span>
        </a>
      </div>
    </section>
  );
};
