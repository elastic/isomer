/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut, euiFontSize, EuiIcon, useEuiTheme } from '@elastic/eui';
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
  HOME_NARROW,
  PANEL_WIDTH,
  TILE_COLUMNS,
  useHome,
  WIDE,
  WIDE_CONTENT_WIDTH,
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
}) => {
  const home = useHome();
  const {
    euiTheme: { size, border, font },
    fontSize,
  } = home;
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener' } : {})}
      css={css`
        ${home.tile(3)};
        ${home.actionCard};
        min-height: 96px;
        &:hover,
        &:focus-visible {
          border-color: ${color};
        }
        &:hover .isomer-studio-door-action {
          text-decoration: underline;
        }
      `}>
      <span css={home.tileTop}>
        <b
          css={css`
            font-size: ${fontSize('m')};
            font-weight: ${font.weight.bold};
            color: ${home.color.heading};
          `}>
          {title}
        </b>
        <span
          css={css`
            margin-top: ${size.xxs};
            font-size: ${fontSize('xxs')};
            font-weight: ${font.weight.medium};
            text-transform: uppercase;
            padding: ${size.xxs} ${size.s};
            border-radius: ${size.l};
            border: ${border.width.thin} solid ${color};
            color: ${color};
            white-space: nowrap;
          `}>
          {tag}
        </span>
      </span>
      <span css={home.tileDescription}>{children}</span>
      <span
        className="isomer-studio-door-action"
        css={css`
          margin-top: auto;
          padding-top: ${size.xs};
          font-size: ${fontSize('xs')};
          font-weight: ${font.weight.medium};
          color: ${color};
        `}>
        {action}
      </span>
    </a>
  );
};

/** The landing page: search, featured primitives, apps, where to go next, and what the runtime loaded. */
export const HomeView = ({
  title,
  router: { route, navigate },
  featured: featuredTypes,
  configProblems = [],
}: HomeViewProps) => {
  const theme = useEuiTheme();
  const home = useHome();
  const {
    euiTheme: { font, size, border, focus },
    color,
    fontSize,
  } = home;
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
    color: ${color.paragraph};
    font-size: ${fontSize('s')};
    line-height: ${font.lineHeightMultiplier};
    a:focus-visible,
    button:focus-visible {
      outline: ${focus.width} solid ${color.heading};
      outline-offset: ${focus.width};
    }
  `;
  const columns = css`
    flex: 1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) ${PANEL_WIDTH}px;
    width: 100%;
    max-width: ${WIDE_CONTENT_WIDTH + 5 * GUTTER + PANEL_WIDTH}px;
    margin-inline: auto;
    @media (max-width: 900px) {
      grid-template-columns: minmax(0, 1fr);
    }
  `;
  const main = css`
    min-width: 0;
    padding: ${size.l} ${GUTTER}px ${size.xxxl};
    @media (max-width: 900px) {
      padding-inline: ${size.base};
    }
  `;
  const content = css`
    container: isomer-home / inline-size;
    display: flex;
    flex-direction: column;
    gap: ${size.xl};
    max-width: ${CONTENT_WIDTH}px;
    margin-inline: auto;
    ${WIDE} {
      max-width: ${WIDE_CONTENT_WIDTH}px;
      ${TILE_COLUMNS}: 4;
    }
  `;
  const aside = css`
    display: flex;
    flex-direction: column;
    gap: ${size.l};
    border-left: ${border.width.thin} solid ${color.line};
    border-image: linear-gradient(
        to bottom,
        transparent,
        ${color.line} ${size.xxxxl},
        ${color.line} calc(100% - ${size.xxxxl}),
        transparent
      )
      1;
    padding: ${size.xxl} ${GUTTER}px ${size.xl} ${size.xl};
    @media (max-width: 900px) {
      border-image: none;
      border-left: 0;
      border-top: ${border.width.thin} solid ${color.line};
      padding-inline: ${size.base};
    }
  `;
  const chips = css`
    display: flex;
    flex-wrap: wrap;
    gap: ${size.s};
    margin-top: -${size.s};
  `;
  const chip = css`
    display: inline-flex;
    align-items: center;
    gap: ${size.s};
    padding: ${size.xs} ${size.m} ${size.xs} ${size.s};
    border-radius: ${size.xl};
    border: ${border.width.thin} solid ${color.line};
    background: ${color.surface};
    font-size: ${fontSize('xs')};
    font-weight: ${font.weight.medium};
    color: ${color.heading};
    text-decoration: none;
    &:hover,
    &:focus-visible {
      background: ${color.surfaceHover};
      border-color: ${color.docs};
      text-decoration: none;
    }
  `;
  const footer = css`
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: ${size.s} ${size.l};
    font-size: ${fontSize('xs')};
    color: ${color.subdued};
    padding: ${size.m} ${GUTTER}px;
    a {
      color: ${color.paragraph};
      text-decoration: none;
    }
    a:hover {
      color: ${color.heading};
      text-decoration: underline;
    }
    @media (max-width: 900px) {
      padding-inline: ${size.base};
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
        <main css={main}>
          <div css={content}>
            <div
              css={css`
                display: flex;
                flex-direction: column;
                gap: ${size.m};
              `}>
              <div
                css={css`
                  font-family: ${font.familyCode};
                  font-size: ${fontSize('xs')};
                  color: ${color.accent};
                `}>
                isomer{' '}
                <span
                  css={css`
                    color: ${color.subdued};
                  `}>
                  n.
                </span>{' '}
                one formula, many forms
              </div>
              <h1
                css={css`
                  margin: 0;
                  font-size: ${
                    euiFontSize(theme, 'xxl', { customScale: 'xl' }).fontSize
                  };
                  font-weight: ${font.weight.bold};
                  letter-spacing: -0.025em;
                  line-height: 1.05;
                  color: ${color.heading};
                  text-wrap: balance;
                  @media (max-width: 900px) {
                    font-size: ${fontSize('xxl')};
                  }
                `}>
                What are we rendering today?
              </h1>
              <p
                css={css`
                  margin: 0;
                  font-size: ${fontSize('m')};
                  text-wrap: pretty;
                `}>
                Isomer Studio is a workbench for primitives, primitive packs,
                compositions, views, tools, and applications built on Isomer.
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
                          color: ${color.paragraph};
                        `}>
                        <PrimitiveGlyph type={types[0]} size={16} />
                      </span>
                    ) : null}
                    {group}
                    <span
                      css={css`
                        font-family: ${font.familyCode};
                        font-size: ${fontSize('xxs')};
                        color: ${color.subdued};
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
                gap: ${size.s};
              `}>
              <div css={home.sectionLabel}>
                <h2 id="isomer-studio-learn" css={home.sectionHeading}>
                  Learn more about Isomer
                </h2>
              </div>
              <div
                css={css`
                  display: grid;
                  grid-template-columns: repeat(3, minmax(0, 1fr));
                  gap: ${size.m};
                  ${HOME_NARROW} {
                    grid-template-columns: minmax(0, 1fr);
                  }
                `}>
                <Door
                  href={formatRoute({
                    mode: 'docs',
                    page: GALLERY,
                    example: 0,
                  })}
                  color={color.docs}
                  tag="Reference"
                  title="Understand primitives"
                  action="Browse reference →">
                  Every primitive in the pack, with its purpose, props and
                  examples.
                </Door>
                <Door
                  href={formatRoute({ mode: 'dev', page: first, example: 0 })}
                  color={color.dev}
                  tag="Workbench"
                  title="Experiment and edit"
                  action="Open the workbench →">
                  Edit a composition and watch it render on every surface the
                  runtime has.
                </Door>
                <Door
                  href={DOCS_URL}
                  external
                  color={color.accent}
                  tag="Guide"
                  title="Learn how Isomer works"
                  action="Read the docs ↗">
                  The composition contract, packs, surfaces and the agent tools.
                </Door>
              </div>
            </section>

            <SurfaceChart {...{ surfaces }} />
          </div>
        </main>

        <aside css={aside}>
          <LoadedPanel {...{ surfaces }} />
        </aside>
      </div>

      <footer css={footer}>
        <span
          css={css`
            display: flex;
            align-items: center;
            gap: ${size.s};
            color: ${color.heading};
            font-weight: ${font.weight.medium};
          `}>
          <EuiIcon type="logoElastic" color="ghost" size="m" />
          Built by Elastic
        </span>
        <span
          css={css`
            display: flex;
            flex-wrap: wrap;
            gap: ${size.xs} ${size.l};
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
