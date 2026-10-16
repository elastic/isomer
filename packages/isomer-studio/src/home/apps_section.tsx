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
import {
  helpTile,
  HOME,
  sectionLabel,
  tile,
  tileActions,
  tileDescription,
  tileName,
  tilesGrid,
  tileTop,
} from './tokens';

const AppTile = ({
  app: { id, title, description, icon },
}: {
  app: StudioApp;
}) => (
  <a
    href={formatLocation({ app: id, path: '' })}
    css={[
      tile(3),
      css`
        &:hover,
        &:focus-within {
          border-color: ${HOME.app};
        }
      `,
    ]}
    data-testid="home-app">
    <span css={tileTop}>
      <span
        css={[
          tileName,
          css`
            color: ${HOME.app};
          `,
        ]}>
        {title}
      </span>
      <span
        css={css`
          color: ${HOME.app};
          margin-top: 1px;
        `}>
        <Glyph svg={icon?.svg} label={title} size={18} />
      </span>
    </span>
    <span css={tileDescription}>{description ?? `Opens ${title}.`}</span>
    <span css={tileActions}>
      <span
        css={css`
          color: ${HOME.app};
        `}>
        Open →
      </span>
    </span>
  </a>
);

const AddAppTile = ({ empty }: { empty: boolean }) => (
  <a
    href={APPS_DOCS_URL}
    target="_blank"
    rel="noopener"
    css={helpTile(3, HOME.app)}
    data-testid="home-add-app">
    <span
      css={[
        tileName,
        css`
          color: ${HOME.fg};
        `,
      ]}>
      {empty ? 'No applications yet' : 'How do I add an application?'}
    </span>
    <span css={tileDescription}>
      {empty
        ? 'An app is a page of the Studio that demonstrates the pack. Add one to the config’s apps, with an id, a title and a load that imports its page.'
        : 'A page of the Studio that demonstrates the pack, declared in the config’s apps.'}
    </span>
    <span
      css={css`
        font-size: 12px;
        font-weight: 600;
        color: ${HOME.app};
      `}>
      Read the config docs ↗
    </span>
  </a>
);

/** One tile per configured app, then how to add one; with none, only the latter, as the empty state. */
export const AppsSection = ({ apps }: { apps: readonly StudioApp[] }) => (
  <section
    aria-labelledby="isomer-studio-applications"
    css={css`
      display: flex;
      flex-direction: column;
      gap: 10px;
    `}>
    <div css={sectionLabel}>
      <span id="isomer-studio-applications">Applications</span>
    </div>
    <div css={tilesGrid}>
      {apps.map((app) => (
        <AppTile key={app.id} {...{ app }} />
      ))}
      <AddAppTile empty={apps.length === 0} />
    </div>
  </section>
);
