/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFieldSearch,
  EuiHorizontalRule,
  EuiIcon,
  transparentize,
  useEuiScrollBar,
  useEuiTheme,
} from '@elastic/eui';
import type { SerializedStyles } from '@emotion/react';
import { css } from '@emotion/react';

import { searchPrimitives } from '../model/search';
import { useStudio } from '../studio_context';

import type { Accent } from './accent';
import { useAccent } from './accent';
import { useClosedNavGroups } from './nav_groups';
import { navPacks } from './nav_sections';
import { Glyph, PrimitiveGlyph } from './primitive_glyph';
import { PrimitivePeek } from './primitive_peek';
import type { StudioMode } from './route';
import { GALLERY } from './route';

export const NAV_WIDTH = { open: 232, closed: 52 } as const;

const NAV_GLYPH_SIZE = 17;
const APPS_GROUP = 'Apps';
const ROW_HEIGHT = 28;
const ROW_GAP = 2;
const HOVER_ROW = 'rgba(255, 255, 255, 0.08)';
const ACTIVE_LABEL = '#FFFFFF';
const LABEL = 'rgba(255, 255, 255, 0.86)';
const GROUP_LABEL = 'rgba(255, 255, 255, 0.6)';
const GLYPH_OPACITY = 0.6;

/** Clears the group header's inset, chevron, and gap, then indents a further `s`. */
const itemInset = ({ xs, m }: { xs: string; m: string }) =>
  `calc(${xs} + ${m} + ${xs})`;

/** An accent tint behind the active entry, with a bar on its leading edge. */
const activeMark = ({ bright }: Accent): SerializedStyles => css`
  background: ${transparentize(bright, 0.18)};
  box-shadow: inset 2px 0 0 ${bright};
  color: ${ACTIVE_LABEL};
`;

const NavIcon = ({
  isActive,
  children,
}: {
  isActive: boolean;
  children: ReactNode;
}) => (
  <span
    css={css`
      display: inline-flex;
      flex: none;
      opacity: ${isActive ? 1 : GLYPH_OPACITY};
    `}>
    {children}
  </span>
);

export interface StudioNavProps {
  mode: StudioMode;
  page: string;
  /** The open app's id; while one is open, no primitive is active. */
  app?: string | undefined;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (page: string) => void;
  onSelectApp: (id: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactElement;
  isPrimitive: boolean;
}

const withPeek = ({ id, isPrimitive }: NavItem, element: React.ReactElement) =>
  isPrimitive ? <PrimitivePeek type={id}>{element}</PrimitivePeek> : element;

const RailEntry = ({
  item,
  isActive,
  accent,
  onSelect,
}: {
  item: NavItem;
  isActive: boolean;
  accent: Accent;
  onSelect: (page: string) => void;
}) => {
  const { id, label, icon } = item;
  return withPeek(
    item,
    <EuiButtonIcon
      display="empty"
      color="text"
      iconType={() => <NavIcon {...{ isActive }}>{icon}</NavIcon>}
      css={css`
        color: ${LABEL};
        ${isActive ? activeMark(accent) : ''}
      `}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      onClick={() => onSelect(id)}
    />
  );
};

const Row = ({
  item,
  isActive,
  accent,
  onSelect,
}: {
  item: NavItem;
  isActive: boolean;
  accent: Accent;
  onSelect: (page: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const { id, label, icon } = item;

  return (
    <li
      css={css`
        flex: none;
      `}>
      {withPeek(
        item,
        <button
          type="button"
          aria-current={isActive ? 'page' : undefined}
          onClick={() => onSelect(id)}
          css={css`
            display: flex;
            align-items: center;
            gap: ${euiTheme.size.s};
            inline-size: 100%;
            block-size: ${ROW_HEIGHT}px;
            padding-inline: ${itemInset(euiTheme.size)} ${euiTheme.size.s};
            border-radius: ${euiTheme.border.radius.small};
            color: ${LABEL};
            font-size: 14px;
            font-weight: ${euiTheme.font.weight.regular};
            text-align: start;

            &:hover {
              background: ${HOVER_ROW};
              color: ${ACTIVE_LABEL};
            }

            ${isActive ? activeMark(accent) : ''}

            &:focus-visible {
              outline: ${euiTheme.focus.width} solid ${accent.bright};
              outline-offset: -${euiTheme.focus.width};
            }
          `}>
          <NavIcon {...{ isActive }}>{icon}</NavIcon>
          <span
            css={css`
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `}>
            {label}
          </span>
        </button>
      )}
    </li>
  );
};

const Group = ({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        flex: none;
      `}>
      <h3
        css={css`
          margin: 0;
        `}>
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={onToggle}
          css={css`
            display: flex;
            align-items: center;
            gap: ${euiTheme.size.xs};
            inline-size: 100%;
            block-size: ${ROW_HEIGHT}px;
            padding-inline: ${euiTheme.size.xs};
            color: ${GROUP_LABEL};
            font-size: 11px;
            font-weight: ${euiTheme.font.weight.semiBold};
            letter-spacing: 0.08em;
            text-transform: uppercase;
            text-align: start;

            &:hover {
              color: ${ACTIVE_LABEL};
            }

            &:focus-visible {
              outline: ${euiTheme.focus.width} solid ${ACTIVE_LABEL};
              outline-offset: -${euiTheme.focus.width};
            }
          `}>
          <EuiIcon
            type={isOpen ? 'chevronSingleDown' : 'chevronSingleRight'}
            size="s"
            aria-hidden={true}
          />
          {title}
        </button>
      </h3>
      {isOpen ? (
        <ul
          css={css`
            display: flex;
            flex-direction: column;
            gap: ${ROW_GAP}px;
            margin: 0;
            padding: 0;
            list-style: none;
          `}>
          {children}
        </ul>
      ) : null}
    </div>
  );
};

/** The config's apps, then primitives under collapsible groups, narrowed by a filter, and the docs-only views. */
export const StudioNav = ({
  mode,
  page,
  app,
  isOpen,
  onSelect,
  onSelectApp,
}: StudioNavProps) => {
  const { euiTheme } = useEuiTheme();
  const accent = useAccent(app === undefined ? mode : 'docs');
  const scrollbar = useEuiScrollBar();
  const {
    runtime,
    apps,
    docs: { primitives },
  } = useStudio();
  const appItems = useMemo(
    (): NavItem[] =>
      apps.map(({ id, title, icon }) => ({
        id,
        label: title,
        icon: <Glyph svg={icon?.svg} label={title} size={NAV_GLYPH_SIZE} />,
        isPrimitive: false,
      })),
    [apps]
  );
  const [filter, setFilter] = useState('');
  const { closed, setOpen } = useClosedNavGroups();
  const separatePacks = runtime.packs.length > 1;

  const packs = useMemo(() => {
    const labels = new Map(primitives.map(({ type, label }) => [type, label]));
    const matched = new Set(
      searchPrimitives(primitives, filter).map(({ type }) => type)
    );
    return navPacks(
      runtime.packs.map((pack) => ({
        id: pack.id,
        groups: pack.authoring?.groups ?? [],
        types: pack.primitives.map(({ type }) => type),
      })),
      (type) => labels.get(type) ?? type,
      (type) => matched.has(type),
      separatePacks
    );
  }, [primitives, runtime.packs, filter, separatePacks]);

  const listed = useMemo(() => {
    const byType = new Map(primitives.map((doc) => [doc.type, doc]));
    return packs.map((pack) => ({
      ...pack,
      groups: pack.groups.map((group) => ({
        ...group,
        items: group.types.flatMap((type): NavItem[] => {
          const doc = byType.get(type);
          return doc
            ? [
                {
                  id: type,
                  label: doc.label,
                  icon: <PrimitiveGlyph {...{ type }} size={NAV_GLYPH_SIZE} />,
                  isPrimitive: true,
                },
              ]
            : [];
        }),
      })),
    }));
  }, [packs, primitives]);
  const gallery = useMemo((): NavItem[] => {
    if (mode !== 'docs') {
      return [];
    }
    return [
      {
        id: GALLERY,
        label: 'Gallery',
        icon: (
          <EuiIcon
            type="grid"
            css={css`
              inline-size: ${NAV_GLYPH_SIZE}px;
              block-size: ${NAV_GLYPH_SIZE}px;
            `}
            aria-hidden
          />
        ),
        isPrimitive: false,
      },
    ];
  }, [mode]);

  const isGroupOpen = (key: string) => Boolean(filter) || !closed.has(key);
  const toggleGroup = (key: string) => {
    if (!filter) {
      setOpen(key, closed.has(key));
    }
  };

  const column = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.xs};
    min-block-size: 0;
    padding-block: 0 ${euiTheme.size.m};
    overflow: hidden;
  `;
  const fieldInset = css`
    flex: none;
    margin-inline: ${euiTheme.size.s};
    margin-block-end: ${euiTheme.size.s};
  `;
  const scroller = css`
    flex: 1;
    min-block-size: 0;
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.s};
    padding-inline: ${euiTheme.size.s};
    overflow: hidden auto;
    ${scrollbar}
  `;
  const rail = css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${euiTheme.size.xxs};
  `;
  const packHeading = css`
    flex: none;
    margin: ${euiTheme.size.s} ${euiTheme.size.xs} 0;
    color: ${euiTheme.colors.textSubdued};
    font-size: 11px;
    font-weight: ${euiTheme.font.weight.semiBold};
    text-transform: uppercase;
  `;
  const activePage = app === undefined ? page : undefined;
  const rows = (items: readonly NavItem[]) =>
    items.map((item) => (
      <Row
        key={item.id}
        {...{ item, accent, onSelect }}
        isActive={item.id === activePage}
      />
    ));
  const appRows = appItems.map((item) => (
    <Row
      key={item.id}
      {...{ item, accent }}
      onSelect={onSelectApp}
      isActive={item.id === app}
    />
  ));

  return (
    <nav css={column} aria-label="Primitives">
      {isOpen ? (
        <div css={fieldInset}>
          <EuiFieldSearch
            compressed
            fullWidth
            placeholder="Filter primitives"
            value={filter}
            onChange={({ target: { value } }) => setFilter(value)}
            aria-label="Filter primitives"
          />
        </div>
      ) : null}
      <div css={scroller}>
        {isOpen ? (
          <>
            {appRows.length ? (
              <Group
                title="Apps"
                isOpen={isGroupOpen(APPS_GROUP)}
                onToggle={() => toggleGroup(APPS_GROUP)}>
                {appRows}
              </Group>
            ) : null}
            {listed.map((pack) => (
              <React.Fragment key={pack.id}>
                {separatePacks ? <h2 css={packHeading}>{pack.label}</h2> : null}
                {pack.groups.map((group) => (
                  <Group
                    key={group.key}
                    title={group.title}
                    isOpen={isGroupOpen(group.key)}
                    onToggle={() => toggleGroup(group.key)}>
                    {rows(group.items)}
                  </Group>
                ))}
              </React.Fragment>
            ))}
            {gallery.length ? (
              <Group
                title="Views"
                isOpen={isGroupOpen('Views')}
                onToggle={() => toggleGroup('Views')}>
                {rows(gallery)}
              </Group>
            ) : null}
          </>
        ) : (
          [
            ...(appItems.length
              ? [{ key: APPS_GROUP, items: appItems, isApps: true }]
              : []),
            ...listed.flatMap((pack) => pack.groups),
            ...(gallery.length ? [{ key: 'Views', items: gallery }] : []),
          ].map((group, index) => (
            <div key={group.key} css={rail}>
              {index > 0 ? <EuiHorizontalRule margin="xs" /> : null}
              {group.items.map((item) =>
                'isApps' in group ? (
                  <RailEntry
                    key={item.id}
                    {...{ item, accent }}
                    onSelect={onSelectApp}
                    isActive={item.id === app}
                  />
                ) : (
                  <RailEntry
                    key={item.id}
                    {...{ item, accent, onSelect }}
                    isActive={item.id === activePage}
                  />
                )
              )}
            </div>
          ))
        )}
      </div>
    </nav>
  );
};
