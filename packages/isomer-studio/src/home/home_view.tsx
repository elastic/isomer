/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut, EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { PrimitiveGlyph } from '../chrome/primitive_glyph';
import { PrimitiveSearch } from '../chrome/primitive_search';
import type { StudioRouter } from '../chrome/route';
import { formatRoute, GALLERY } from '../chrome/route';
import { pickFeatured } from '../model/featured';
import { useStudio } from '../studio_context';
import { previewSurfaces } from '../surfaces/surface_select';

import { AppsSection } from './apps_section';
import { FeaturedStrip } from './featured_strip';
import { DOCS_URL, LICENSE_URL, REPO_URL } from './links';
import { LoadedPanel } from './loaded_panel';
import { SurfaceChart } from './surface_chart';
import {
  CONTENT_WIDTH,
  GUTTER,
  HOME,
  PANEL_WIDTH,
  sectionLabel,
} from './tokens';

export interface HomeViewProps {
  title: string;
  router: Pick<StudioRouter, 'route' | 'navigate'>;
  /** The config's `featured`; without it Home draws at random. */
  featured?: readonly string[] | undefined;
  configProblems?: readonly string[] | undefined;
}

const Door = ({
  href,
  external = false,
  color,
  tag,
  title,
  children,
  action,
}: {
  href: string;
  external?: boolean;
  color: string;
  tag: string;
  title: string;
  children: string;
  action: string;
}) => (
  <a
    href={href}
    {...(external ? { target: '_blank', rel: 'noopener' } : {})}
    css={css`
      display: grid;
      grid-template-rows: subgrid;
      grid-row: span 3;
      row-gap: 5px;
      padding: 14px 16px;
      border-radius: 10px;
      box-sizing: border-box;
      min-height: 96px;
      background: ${HOME.surface1};
      border: 1px solid ${HOME.line2};
      color: ${HOME.fg2};
      text-decoration: none;
      transition:
        background 0.12s,
        border-color 0.12s;
      &:hover,
      &:focus-visible {
        background: ${HOME.surface3};
        border-color: ${color};
        text-decoration: none;
      }
      &:hover .isomer-studio-door-action {
        text-decoration: underline;
      }
    `}>
    <span
      css={css`
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
      `}>
      <b
        css={css`
          font-size: 15px;
          font-weight: 600;
          color: ${HOME.fg};
        `}>
        {title}
      </b>
      <span
        css={css`
          margin-top: 3px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 2px 7px;
          border-radius: 999px;
          border: 1px solid ${color};
          color: ${color};
          white-space: nowrap;
        `}>
        {tag}
      </span>
    </span>
    <span
      css={css`
        font-size: 12.5px;
        text-wrap: pretty;
      `}>
      {children}
    </span>
    <span
      className="isomer-studio-door-action"
      css={css`
        margin-top: auto;
        padding-top: 4px;
        font-size: 12px;
        font-weight: 500;
        color: ${color};
      `}>
      {action}
    </span>
  </a>
);

/** The landing page: search, featured primitives, apps, where to go next, and what the runtime loaded. */
export const HomeView = ({
  title,
  router: { route, navigate },
  featured: featuredTypes,
  configProblems = [],
}: HomeViewProps) => {
  const {
    euiTheme: { font },
  } = useEuiTheme();
  const {
    docs: { primitives, groups, surfaces: supported },
    rasterizePng,
    apps,
  } = useStudio();
  const featured = useMemo(
    () => pickFeatured(primitives, featuredTypes),
    [primitives, featuredTypes]
  );
  const surfaces = previewSurfaces(supported, Boolean(rasterizePng));
  const first = groups[0]?.types[0] ?? primitives[0]?.type ?? '';
  const year = new Date().getFullYear();

  const page = css`
    flex: 1;
    min-height: 0;
    overflow: auto;
    display: flex;
    flex-direction: column;
    color: ${HOME.fg2};
    font-size: 14px;
    line-height: 1.5;
  `;
  const columns = css`
    flex: 1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) ${PANEL_WIDTH}px;
    @media (max-width: 900px) {
      grid-template-columns: minmax(0, 1fr);
    }
  `;
  const main = css`
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 32px;
    padding: 20px 56px 48px ${GUTTER}px;
    > * {
      max-width: ${CONTENT_WIDTH}px;
    }
    @media (max-width: 900px) {
      padding-inline: 16px;
    }
  `;
  const aside = css`
    display: flex;
    flex-direction: column;
    gap: 20px;
    border-left: 1px solid ${HOME.line1};
    padding: 20px ${GUTTER}px 32px 32px;
    @media (max-width: 900px) {
      border-left: 0;
      border-top: 1px solid ${HOME.line1};
      padding-inline: 16px;
    }
  `;
  const chips = css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: -8px;
  `;
  const chip = css`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 12px 6px 10px;
    border-radius: 999px;
    border: 1px solid ${HOME.line2};
    background: ${HOME.surface1};
    font-size: 13px;
    font-weight: 500;
    color: ${HOME.fg};
    text-decoration: none;
    &:hover,
    &:focus-visible {
      background: ${HOME.surface3};
      border-color: ${HOME.docs};
      text-decoration: none;
    }
  `;
  const footer = css`
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px 24px;
    font-size: 12px;
    color: ${HOME.fg3};
    border-top: 1px solid ${HOME.line1};
    padding: 14px ${GUTTER}px;
    a {
      color: ${HOME.fg2};
      text-decoration: none;
    }
    a:hover {
      color: ${HOME.fg};
      text-decoration: underline;
    }
    @media (max-width: 900px) {
      padding-inline: 16px;
    }
  `;

  return (
    <div css={page} data-testid="home">
      {configProblems.length ? (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="error"
          title="The config is invalid; the Studio keeps the last valid one">
          <ul>
            {configProblems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </EuiCallOut>
      ) : null}
      <div css={columns}>
        <div css={main}>
          <div
            css={css`
              display: flex;
              flex-direction: column;
              gap: 12px;
            `}>
            <div
              css={css`
                font-family: ${font.familyCode};
                font-size: 12px;
                color: ${HOME.accent};
              `}>
              isomer{' '}
              <span
                css={css`
                  color: ${HOME.fg3};
                `}>
                n.
              </span>{' '}
              one formula, many forms
            </div>
            <h1
              css={css`
                margin: 0;
                font-size: 44px;
                font-weight: 600;
                letter-spacing: -0.025em;
                line-height: 1.05;
                color: ${HOME.fg};
                max-width: 16ch;
                text-wrap: balance;
                @media (max-width: 900px) {
                  font-size: 32px;
                }
              `}>
              What are we rendering today?
            </h1>
            <p
              css={css`
                margin: 0;
                font-size: 16px;
                max-width: 52ch;
                text-wrap: pretty;
              `}>
              A workbench for primitives, primitive packs, compositions, views,
              and applications built on Isomer.
            </p>
          </div>

          <PrimitiveSearch
            size="large"
            placeholder="Search primitives by name, purpose or prop"
            onSelectPrimitive={(type) =>
              navigate({ mode: route.mode, page: type, example: 0 })
            }
          />

          {groups.length ? (
            <nav aria-label="Primitive categories" css={chips}>
              {groups.map(({ title: group, types }) => (
                <a
                  key={group}
                  href={formatRoute({
                    mode: 'docs',
                    page: GALLERY,
                    example: 0,
                    group,
                  })}
                  css={chip}>
                  {types[0] ? (
                    <span
                      css={css`
                        color: ${HOME.fg2};
                      `}>
                      <PrimitiveGlyph type={types[0]} size={16} />
                    </span>
                  ) : null}
                  {group}
                  <span
                    css={css`
                      font-family: ${font.familyCode};
                      font-size: 11px;
                      color: ${HOME.fg3};
                    `}>
                    {types.length}
                  </span>
                </a>
              ))}
            </nav>
          ) : null}

          <FeaturedStrip {...{ featured }} total={primitives.length} />

          <AppsSection {...{ apps }} />

          <section
            aria-labelledby="isomer-studio-learn"
            css={css`
              display: flex;
              flex-direction: column;
              gap: 10px;
            `}>
            <div css={sectionLabel}>
              <span id="isomer-studio-learn">Learn more about Isomer</span>
            </div>
            <div
              css={css`
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 12px;
                @media (max-width: 900px) {
                  grid-template-columns: minmax(0, 1fr);
                }
              `}>
              <Door
                href={formatRoute({ mode: 'docs', page: GALLERY, example: 0 })}
                color={HOME.docs}
                tag="Docs"
                title="Read and use"
                action="Open the gallery →">
                Every primitive in the pack, with its purpose, props and
                examples.
              </Door>
              <Door
                href={formatRoute({ mode: 'dev', page: first, example: 0 })}
                color={HOME.dev}
                tag="Dev"
                title="Build and test"
                action="Open the workbench →">
                Edit a composition and watch it render on every surface the
                runtime has.
              </Door>
              <Door
                href={DOCS_URL}
                external
                color={HOME.accent}
                tag="Guide"
                title="Learn how Isomer works"
                action="Read the docs ↗">
                The composition contract, packs, surfaces and the agent tools.
              </Door>
            </div>
          </section>

          <SurfaceChart {...{ surfaces }} />
        </div>

        <aside css={aside}>
          <LoadedPanel {...{ surfaces }} />
        </aside>
      </div>

      <footer css={footer}>
        <span
          css={css`
            display: flex;
            align-items: center;
            gap: 8px;
            color: ${HOME.fg};
            font-weight: 500;
          `}>
          <EuiIcon type="logoElastic" color="ghost" size="m" />
          Built by Elastic
        </span>
        <span
          css={css`
            display: flex;
            flex-wrap: wrap;
            gap: 4px 18px;
          `}>
          <a href={REPO_URL} target="_blank" rel="noopener">
            github.com/elastic/isomer ↗
          </a>
          <a href={DOCS_URL} target="_blank" rel="noopener">
            Docs ↗
          </a>
          <a href={LICENSE_URL} target="_blank" rel="noopener">
            Elastic License 2.0
          </a>
        </span>
        <small>
          © {year} Elasticsearch B.V. · {title}
        </small>
      </footer>
    </div>
  );
};
