/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { IsomerMark } from '../chrome/isomer_mark';
import type { PreviewSurface } from '../surfaces/surface_select';
import {
  PREVIEW_ICONS,
  PREVIEW_LABELS,
  SURFACE_NOTES,
} from '../surfaces/surface_select';

import { CONTENT_WIDTH, HOME, quietLabel, WIDE } from './tokens';

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
  const {
    euiTheme: { font },
  } = useEuiTheme();
  const [note, setNote] = useState('');
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
      gap: 10px;
      padding: 8px 0;
    }
  `;
  const wires = css`
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    color: ${HOME.accent};
    @container (max-width: ${CONTENT_WIDTH - 1}px) {
      display: none;
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
    gap: 10px;
    width: clamp(150px, 30%, 190px);
    height: 50px;
    border-radius: 999px;
    background: ${HOME.surface3};
    border: 1px solid ${HOME.accentBorder};
    box-shadow:
      0 0 0 4px rgba(240, 78, 152, 0.18),
      0 4px 14px rgba(0, 0, 0, 0.4);
    font-family: ${font.familyCode};
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${HOME.accent};
    cursor: default;
    transition:
      scale 0.12s,
      box-shadow 0.12s,
      background 0.12s;
    &:hover,
    &:focus-visible {
      background: rgba(255, 255, 255, 0.16);
      box-shadow:
        0 0 0 6px rgba(240, 78, 152, 0.28),
        0 6px 18px rgba(0, 0, 0, 0.45);
      scale: 1.04;
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
    gap: 4px;
    width: ${CARD_WIDTH}px;
    height: ${CARD_HEIGHT}px;
    border-radius: 8px;
    background: #ffffff;
    color: ${HOME.shell};
    box-shadow:
      0 2px 6px rgba(0, 0, 0, 0.35),
      0 0 0 1px rgba(0, 0, 0, 0.08);
    font-family: ${font.familyCode};
    font-size: 11px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    cursor: default;
    transition: transform 0.12s;
    &:hover,
    &:focus-visible {
      z-index: 1;
      transform: translateY(-6px);
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
    gap: 20px;
    ${WIDE} {
      grid-template-columns: ${CONTENT_WIDTH}px minmax(0, 1fr);
      grid-template-areas: 'chart blurb';
      gap: 32px;
      align-items: center;
    }
  `;
  const blurb = css`
    grid-area: blurb;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 52ch;
  `;
  const blurbTitle = css`
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.01em;
    line-height: 1.25;
    text-wrap: balance;
    color: ${HOME.fg};
  `;
  const blurbText = css`
    margin: 0;
    font-size: 14px;
    color: ${HOME.fg2};
    text-wrap: pretty;
  `;
  const chart = css`
    grid-area: chart;
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  `;

  return (
    <section
      aria-labelledby="isomer-studio-surfaces"
      css={css`
        display: flex;
        flex-direction: column;
        gap: 10px;
      `}>
      <div css={quietLabel}>
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
              min-height: 20px;
              text-align: center;
              font-size: 12.5px;
              color: ${HOME.fg2};
              text-wrap: pretty;
            `}>
            {note}
          </div>
        </div>
      </div>
    </section>
  );
};
