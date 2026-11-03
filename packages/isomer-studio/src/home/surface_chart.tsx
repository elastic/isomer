/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect, useRef, useState } from 'react';
import { EuiIcon, transparentize, useEuiShadow } from '@elastic/eui';
import { css } from '@emotion/react';

import { IsomerMark } from '../chrome/isomer_mark';
import type { PreviewSurface } from '../surfaces/surface_select';
import {
  PREVIEW_ICONS,
  PREVIEW_LABELS,
  SURFACE_NOTES,
} from '../surfaces/surface_select';

import { CONTENT_WIDTH, useHome, WIDE } from './tokens';

const COMPOSITION_NOTE =
  'composition: one typed Composition, validated once, rendered to every surface the runtime has.';

/** Percent of the stage: the pill's center, the bus below it, the row of cards, and half a card's height. */
const PILL_Y = 16;
const HUB_Y = 26;
const BUS_Y = 48;
const ROW_Y = 74;
const CARD_HALF = 15.8;

const CARD_WIDTH = 64;
const CARD_HEIGHT = 82;

const spotsFor = (count: number): number[] =>
  count === 1
    ? [50]
    : Array.from({ length: count }, (_, i) => 10 + (i * 80) / (count - 1));

/** The composition on top, wired like an org chart to one white card per surface the runtime has. */
export const SurfaceChart = ({
  surfaces,
}: {
  surfaces: readonly PreviewSurface[];
}) => {
  const home = useHome();
  const {
    euiTheme: { font, size, border, colors, focus, animation },
    color,
    fontSize,
  } = home;
  const cardShadow = useEuiShadow('s', { border: 'none' });
  const pillShadow = useEuiShadow('m', { border: 'none' });
  const pillHoverShadow = useEuiShadow('l', { border: 'none' });
  const ring = (alpha: number) => transparentize(color.accentBorder, alpha);
  const [note, setNote] = useState('');
  const stageRef = useRef<HTMLDivElement>(null);
  const [connections, setConnections] = useState<readonly string[]>([]);
  useLayoutEffect(() => {
    const element = stageRef.current;
    if (!element) {
      return;
    }
    const measure = () => {
      const stageBox = element.getBoundingClientRect();
      const [source, ...cards] = Array.from(
        element.querySelectorAll<HTMLElement>('[tabindex="0"]')
      ).map((item) => item.getBoundingClientRect());
      if (!source) {
        return;
      }
      const sourceX = source.left + source.width / 2 - stageBox.left;
      const sourceY = source.bottom - stageBox.top;
      const hubY = sourceY + 14;
      setConnections(
        cards.map((box) => {
          const x = box.left + box.width / 2 - stageBox.left;
          const y = box.top - stageBox.top;
          return `M ${sourceX} ${sourceY} V ${hubY} H 4 V ${y - 14} H ${x} V ${y}`;
        })
      );
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [surfaces]);
  const spots = spotsFor(surfaces.length);
  const first = spots[0] ?? 50;
  const last = spots[spots.length - 1] ?? 50;

  const stage = css`
    position: relative;
    width: 100%;
    max-width: ${CONTENT_WIDTH}px;
    margin-inline: auto;
    aspect-ratio: 62 / 26;
    @container (max-width: ${CONTENT_WIDTH - 1}px) {
      aspect-ratio: auto;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(${CARD_WIDTH}px, 1fr));
      justify-items: center;
      gap: ${size.xl} ${size.s};
      padding: ${size.s} 0 ${size.s} ${size.base};
      box-sizing: border-box;
    }
  `;
  const wires = css`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    color: ${color.accent};
    pointer-events: none;
    @container (max-width: ${CONTENT_WIDTH - 1}px) {
      display: none;
    }
  `;
  const wrappedWires = css`
    ${wires};
    display: none;
    @container (max-width: ${CONTENT_WIDTH - 1}px) {
      display: block;
    }
  `;
  const pill = css`
    position: absolute;
    left: 50%;
    top: ${PILL_Y}%;
    translate: -50% -50%;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${size.s};
    width: clamp(150px, 30%, 190px);
    height: 50px;
    border-radius: 50px;
    background: ${color.surfaceHover};
    border: ${border.width.thin} solid ${color.accentBorder};
    outline: ${size.xs} solid ${ring(0.18)};
    ${pillShadow};
    font-family: ${font.familyCode};
    font-size: ${fontSize('s')};
    font-weight: ${font.weight.medium};
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${color.accent};
    cursor: default;
    transition:
      scale ${animation.fast},
      box-shadow ${animation.fast},
      outline ${animation.fast},
      background ${animation.fast};
    &:hover,
    &:focus-visible {
      background: ${color.line};
      outline: ${size.s} solid ${ring(0.28)};
      ${pillHoverShadow};
      scale: 1.04;
    }
    @media (prefers-reduced-motion: reduce) {
      transition: none;
      &:hover,
      &:focus-visible {
        scale: none;
      }
    }
    @container (max-width: ${CONTENT_WIDTH - 1}px) {
      position: static;
      translate: none;
      grid-column: 1 / -1;
      width: 190px;
    }
  `;
  const card = (x: number) => css`
    position: absolute;
    left: ${x}%;
    top: ${ROW_Y}%;
    margin: -${CARD_HEIGHT / 2}px 0 0 -${CARD_WIDTH / 2}px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${size.xs};
    width: ${CARD_WIDTH}px;
    height: ${CARD_HEIGHT}px;
    border-radius: ${border.radius.control};
    background: ${colors.plainLight};
    color: ${colors.textInk};
    ${cardShadow};
    font-family: ${font.familyCode};
    font-size: ${fontSize('xxs')};
    letter-spacing: 0.02em;
    text-transform: uppercase;
    cursor: default;
    transition: transform ${animation.fast};
    &:hover,
    &:focus-visible {
      z-index: 1;
      transform: translateY(-${size.s});
    }
    @media (prefers-reduced-motion: reduce) {
      transition: none;
      &:hover,
      &:focus-visible {
        transform: none;
        outline: ${focus.width} solid ${color.accent};
        outline-offset: ${focus.width};
      }
    }
    @container (max-width: ${CONTENT_WIDTH - 1}px) {
      position: static;
      margin: 0;
    }
  `;

  const body = css`
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'blurb'
      'chart';
    gap: ${size.l};
    ${WIDE} {
      grid-template-columns: ${CONTENT_WIDTH}px minmax(0, 1fr);
      grid-template-areas: 'chart blurb';
      gap: ${size.xl};
      align-items: center;
    }
  `;
  const blurb = css`
    grid-area: blurb;
    display: flex;
    flex-direction: column;
    gap: ${size.s};
    max-width: 52ch;
  `;
  const blurbTitle = css`
    margin: 0;
    font-size: ${fontSize('l')};
    font-weight: ${font.weight.bold};
    letter-spacing: -0.01em;
    line-height: 1.25;
    text-wrap: balance;
    color: ${color.heading};
  `;
  const blurbText = css`
    margin: 0;
    font-size: ${fontSize('s')};
    color: ${color.paragraph};
    text-wrap: pretty;
  `;
  const chart = css`
    grid-area: chart;
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    gap: ${size.s};
    min-width: 0;
  `;

  return (
    <section
      aria-labelledby="isomer-studio-surfaces"
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${size.s};
      `}>
      <div css={home.quietLabel}>
        <span id="isomer-studio-surfaces">One composition, every surface</span>
      </div>
      <div css={body}>
        <div css={blurb}>
          <h2 css={blurbTitle}>Author once, render anywhere.</h2>
          <p css={blurbText}>
            Isomer turns one typed composition into every surface your product
            speaks: web, Slack, Markdown, images.
          </p>
          <p css={blurbText}>
            Hosts keep their data, authorization and routing. Isomer owns the
            contract, the primitive catalog, validation and rendering.
          </p>
        </div>
        <div css={chart}>
          <div
            ref={stageRef}
            css={stage}
            onMouseLeave={() => setNote('')}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setNote('');
              }
            }}>
            <div
              css={pill}
              tabIndex={0}
              onMouseEnter={() => setNote(COMPOSITION_NOTE)}
              onFocus={() => setNote(COMPOSITION_NOTE)}>
              <IsomerMark size={26} />
              <span>composition</span>
            </div>
            <svg
              data-surface-connections="wide"
              css={wires}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden={true}>
              {[
                [50, HUB_Y, 50, BUS_Y],
                [first, BUS_Y, last, BUS_Y],
                ...spots.map((x) => [x, BUS_Y, x, ROW_Y - CARD_HALF]),
              ].map(([x1, y1, x2, y2], index) => (
                <line
                  key={index}
                  {...{ x1, y1, x2, y2 }}
                  stroke="currentColor"
                  strokeWidth="1"
                  opacity="0.55"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            <svg
              data-surface-connections="wrapped"
              css={wrappedWires}
              opacity="0.55"
              aria-hidden={true}>
              {connections.map((d, index) => (
                <path
                  key={surfaces[index]}
                  d={d}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              ))}
            </svg>
            {surfaces.map((surface, index) => {
              const text = `${surface}: ${SURFACE_NOTES[surface]}`;
              return (
                <div
                  key={surface}
                  css={card(spots[index] ?? 50)}
                  tabIndex={0}
                  aria-label={PREVIEW_LABELS[surface]}
                  onMouseEnter={() => setNote(text)}
                  onFocus={() => setNote(text)}>
                  <EuiIcon type={PREVIEW_ICONS[surface]} size="xl" />
                  <span>
                    {surface === 'snapshot'
                      ? 'snap'
                      : surface === 'markdown'
                        ? 'md'
                        : surface}
                  </span>
                </div>
              );
            })}
          </div>
          <div
            aria-live="polite"
            css={css`
              min-height: ${size.l};
              text-align: center;
              font-size: ${fontSize('xs')};
              color: ${color.paragraph};
              text-wrap: pretty;
            `}>
            {note}
          </div>
        </div>
      </div>
    </section>
  );
};
