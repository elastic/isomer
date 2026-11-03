/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';

import { Glyph } from '../chrome/primitive_glyph';
import { formatLocation } from '../chrome/route';
import type { StudioApp } from '../config';

import { APPS_DOCS_URL } from './links';
import { useHome } from './tokens';

const AppTile = ({
  app: { id, title, description, icon },
}: {
  app: StudioApp;
}) => {
  const home = useHome();
  const { app } = home.color;
  return (
    <a
      href={formatLocation({ app: id, path: '' })}
      css={[
        home.tile(3),
        css`
          &:hover,
          &:focus-within {
            border-color: ${app};
          }
        `,
      ]}
      data-testid="home-app">
      <span css={home.tileTop}>
        <span
          css={[
            home.tileName,
            css`
              color: ${app};
            `,
          ]}>
          {title}
        </span>
        <span
          css={css`
            color: ${app};
          `}>
          <Glyph svg={icon?.svg} label={title} size={18} />
        </span>
      </span>
      <span css={home.tileDescription}>{description ?? `Opens ${title}.`}</span>
      <span css={home.tileActions}>
        <span
          css={css`
            color: ${app};
          `}>
          Open →
        </span>
      </span>
    </a>
  );
};

const AddAppTile = ({ empty }: { empty: boolean }) => {
  const home = useHome();
  const { color, fontSize, euiTheme } = home;
  return (
    <a
      href={APPS_DOCS_URL}
      target="_blank"
      rel="noopener"
      css={home.helpTile(3, color.app)}
      data-testid="home-add-app">
      <span
        css={[
          home.tileName,
          css`
            color: ${color.heading};
          `,
        ]}>
        {empty ? 'No applications yet' : 'How do I add an application?'}
      </span>
      <span css={home.tileDescription}>
        {empty
          ? 'An app is a page of the Studio that demonstrates the pack. Add one to the config’s apps, with an id, a title and a load that imports its page.'
          : 'A page of the Studio that demonstrates the pack, declared in the config’s apps.'}
      </span>
      <span
        css={css`
          font-size: ${fontSize('xs')};
          font-weight: ${euiTheme.font.weight.bold};
          color: ${color.app};
        `}>
        Read the config docs ↗
      </span>
    </a>
  );
};

/** One tile per configured app, then how to add one; with none, only the latter, as the empty state. */
export const AppsSection = ({ apps }: { apps: readonly StudioApp[] }) => {
  const home = useHome();
  return (
    <section
      aria-labelledby="isomer-studio-applications"
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${home.euiTheme.size.s};
      `}>
      <div css={home.sectionLabel}>
        <h2 id="isomer-studio-applications" css={home.sectionHeading}>
          Applications
        </h2>
      </div>
      <div css={home.tilesGrid}>
        {apps.map((app) => (
          <AppTile key={app.id} {...{ app }} />
        ))}
        <AddAppTile empty={apps.length === 0} />
      </div>
    </section>
  );
};
