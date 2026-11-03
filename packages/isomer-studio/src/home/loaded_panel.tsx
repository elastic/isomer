/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { css } from '@emotion/react';

import { Glyph } from '../chrome/primitive_glyph';
import { useStudio } from '../studio_context';
import type { PreviewSurface } from '../surfaces/surface_select';
import { PREVIEW_ICONS } from '../surfaces/surface_select';

import { APPS_DOCS_URL, STUDIO_CONFIG_DOCS_URL, VIEWS_DOCS_URL } from './links';
import type { Home } from './tokens';
import { useHome } from './tokens';

const Section = ({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) => {
  const {
    euiTheme: { font, size },
    color,
    fontSize,
  } = useHome();
  return (
    <section
      aria-label={title}
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${size.s};
      `}>
      <div
        css={css`
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          font-size: ${fontSize('xxs')};
          text-transform: uppercase;
          color: ${color.subdued};
        `}>
        <span>{title}</span>
        <span
          css={css`
            font-family: ${font.familyCode};
            text-transform: none;
          `}>
          {count}
        </span>
      </div>
      {children}
    </section>
  );
};

const panelStyles = ({ euiTheme: { font, size }, color, fontSize }: Home) => ({
  row: css`
    display: flex;
    flex-direction: column;
    gap: ${size.xxs};
    min-width: 0;
    font-size: ${fontSize('xs')};
  `,
  mono: css`
    font-family: ${font.familyCode};
    color: ${color.heading};
    overflow-wrap: anywhere;
  `,
  meta: css`
    color: ${color.subdued};
    text-wrap: pretty;
  `,
  link: css`
    font-weight: ${font.weight.bold};
    color: ${color.accent};
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  `,
});

/** A dashed box saying what is missing, how to add it, and where that is documented. */
const Empty = ({
  children,
  href,
  action,
}: {
  children: ReactNode;
  href: string;
  action: string;
}) => {
  const home = useHome();
  const {
    euiTheme: { size, border },
    color,
    fontSize,
  } = home;
  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${size.s};
        font-size: ${fontSize('xs')};
        color: ${color.subdued};
        padding: ${size.s} ${size.m};
        border: ${border.width.thin} dashed ${color.dashed};
        border-radius: ${border.radius.control};
        text-wrap: pretty;
      `}>
      <span>{children}</span>
      <a
        href={href}
        target="_blank"
        rel="noopener"
        css={panelStyles(home).link}>
        {action} ↗
      </a>
    </div>
  );
};

/** What the runtime loaded: packs, views, apps and surfaces, then where that is configured. */
export const LoadedPanel = ({
  surfaces,
}: {
  surfaces: readonly PreviewSurface[];
}) => {
  const home = useHome();
  const {
    euiTheme: { font, size, border },
    color,
    fontSize,
  } = home;
  const { row, mono, meta, link } = panelStyles(home);
  const {
    runtime,
    apps,
    docs: { primitives, views },
  } = useStudio();

  return (
    <>
      <h2
        css={css`
          margin: 0;
          font-size: ${fontSize('s')};
          font-weight: ${font.weight.bold};
          color: ${color.heading};
        `}>
        Loaded in this Studio
      </h2>

      <Section title="Primitive packs" count={runtime.packs.length}>
        {runtime.packs.map((pack) => {
          const groups = pack.authoring?.groups?.length ?? 0;
          const count = pack.primitives.length;
          return (
            <div key={pack.id} css={row}>
              <span css={mono}>{pack.id}</span>
              <span css={meta}>
                {count} {count === 1 ? 'primitive' : 'primitives'}
                {groups
                  ? ` · ${groups} ${groups === 1 ? 'group' : 'groups'}`
                  : ''}
              </span>
            </div>
          );
        })}
      </Section>

      <Section title="Views" count={views.length}>
        {views.length ? (
          views.map(({ id, title, description }) => (
            <div key={id} css={row}>
              <span css={mono}>{id}</span>
              <span css={meta}>{description || title}</span>
            </div>
          ))
        ) : (
          <Empty href={VIEWS_DOCS_URL} action="Read about views">
            None registered. A view is a host-owned composition the runtime
            builds by id: define one with defineView and pass it in
            createIsomerRuntime({'{ views }'}), or register it on
            runtime.viewRegistry.
          </Empty>
        )}
      </Section>

      <Section title="Apps" count={apps.length}>
        {apps.length ? (
          apps.map(({ id, title, description, icon }) => (
            <div
              key={id}
              css={css`
                display: flex;
                align-items: flex-start;
                gap: ${size.s};
                min-width: 0;
              `}>
              <span
                css={css`
                  color: ${color.app};
                `}>
                <Glyph svg={icon?.svg} label={title} size={18} />
              </span>
              <div css={row}>
                <span
                  css={css`
                    font-weight: ${font.weight.bold};
                    color: ${color.heading};
                  `}>
                  {title}
                </span>
                {description ? <span css={meta}>{description}</span> : null}
              </div>
            </div>
          ))
        ) : (
          <Empty href={APPS_DOCS_URL} action="Read about apps">
            None configured. An app is a page of the Studio that shows the pack
            in use: add {'{ id, title, description, load }'} to the
            config&apos;s apps.
          </Empty>
        )}
      </Section>

      <Section title="Surfaces" count={surfaces.length}>
        <div
          css={css`
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: ${size.s} ${size.m};
          `}>
          {surfaces.map((surface) => (
            <span
              key={surface}
              css={css`
                display: flex;
                align-items: center;
                gap: ${size.s};
                font-family: ${font.familyCode};
                font-size: ${fontSize('xs')};
                color: ${color.heading};
              `}>
              <EuiIcon type={PREVIEW_ICONS[surface]} size="m" />
              {surface}
            </span>
          ))}
        </div>
      </Section>

      <div
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${size.s};
          border-top: ${border.width.thin} solid ${color.line};
          padding-top: ${size.base};
          font-size: ${fontSize('xs')};
          color: ${color.subdued};
          text-wrap: pretty;
        `}>
        <p
          css={css`
            margin: 0;
          `}>
          Everything here comes from the Studio config: the runtime and its
          packs, the apps, and which primitives are featured.{' '}
          {primitives.length}{' '}
          {primitives.length === 1 ? 'primitive is' : 'primitives are'} loaded.
        </p>
        <a
          href={STUDIO_CONFIG_DOCS_URL}
          target="_blank"
          rel="noopener"
          css={link}>
          Edit the config ↗
        </a>
      </div>
    </>
  );
};
