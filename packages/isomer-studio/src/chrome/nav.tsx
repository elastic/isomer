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

import type { StudioApp, StudioAppPage } from '../config';
import { searchPrimitives } from '../model/search';
import { useStudio } from '../studio_context';

import type { Accent } from './accent';
import { useAccent } from './accent';
import { activeAppPage, appPageSections, filterAppPages } from './app_pages';
import { useClosedNavGroups } from './nav_groups';
import { navPacks } from './nav_sections';
import { Glyph, PrimitiveGlyph } from './primitive_glyph';
import { PrimitivePeek } from './primitive_peek';
import type { StudioMode } from './route';
import { GALLERY } from './route';

export const NAV_WIDTH = { open: 272, closed: 52 } as const;

const NAV_GLYPH_SIZE = 17;
const ROW_HEIGHT = 32;
const ROW_GAP = 4;
const HOVER_ROW = 'rgba(255, 255, 255, 0.08)';
const ACTIVE_LABEL = '#FFFFFF';
const LABEL = 'rgba(255, 255, 255, 0.86)';
const GROUP_LABEL = 'rgba(255, 255, 255, 0.6)';
const GLYPH_OPACITY = 0.6;

/** Clears the group header's inset, chevron, and gap, then indents a further `s`. */
const itemInset = ({ xs, m }: { xs: string; m: string }) =>
  `calc(${xs} + ${m} + ${xs})`;

/** Lines an app's pages up with its label, past its glyph and gap. */
const pageInset = ({ m, s }: { m: string; s: string }) =>
  `calc(${m} + ${NAV_GLYPH_SIZE}px + ${s})`;

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
  /** The open app's `path`, which picks its active page. */
  appPath?: string | undefined;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (page: string) => void;
  onSelectApp: (id: string, path?: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactElement | undefined;
  isPrimitive: boolean;
}

const GALLERY_ITEM: NavItem = {
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
};

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
  inset,
  children,
}: {
  item: NavItem;
  isActive: boolean;
  accent: Accent;
  onSelect: (page: string) => void;
  /** Defaults to {@link itemInset}. */
  inset?: string | undefined;
  /** Rendered after the row's button, inside its list item. */
  children?: ReactNode;
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
            padding-inline: ${inset ?? itemInset(euiTheme.size)}
              ${euiTheme.size.s};
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
          {icon ? <NavIcon {...{ isActive }}>{icon}</NavIcon> : null}
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
      {children}
    </li>
  );
};

const subList = (gap: number) => css`
  display: flex;
  flex-direction: column;
  gap: ${gap}px;
  margin: ${gap}px 0 0;
  padding: 0;
  list-style: none;
`;

const appItem = ({ id, title, icon }: StudioApp): NavItem => ({
  id,
  label: title,
  icon: <Glyph svg={icon?.svg} label={title} size={NAV_GLYPH_SIZE} />,
  isPrimitive: false,
});

/** An app's row, with its pages under it in their sections. */
const AppRow = ({
  app,
  openApp,
  appPath,
  filter,
  accent,
  onSelectApp,
}: {
  app: StudioApp;
  /** The open app's id. */
  openApp: string | undefined;
  appPath: string;
  filter: string;
  accent: Accent;
  onSelectApp: (id: string, path?: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const { id, title, pages = [] } = app;
  const item = useMemo(() => appItem(app), [app]);
  const isOpen = openApp === id;
  const active = isOpen ? activeAppPage(pages, appPath) : undefined;
  const sections = appPageSections(filterAppPages(pages, filter));
  const inset = pageInset(euiTheme.size);
  const pageRows = (listed: readonly StudioAppPage[]) =>
    listed.map(({ path, title: label }) => (
      <Row
        key={path}
        item={{ id: path, label, isPrimitive: false }}
        isActive={active?.path === path}
        onSelect={(next) => onSelectApp(id, next)}
        {...{ accent, inset }}
      />
    ));

  return (
    <Row
      {...{ item, accent }}
      inset={euiTheme.size.m}
      isActive={isOpen && active === undefined}
      onSelect={() => onSelectApp(id)}>
      {sections.length ? (
        <ul css={subList(ROW_GAP)} aria-label={`${title} pages`}>
          {sections.map(({ title: section, pages: listed }) =>
            section === undefined ? (
              <React.Fragment key="unsectioned">
                {pageRows(listed)}
              </React.Fragment>
            ) : (
              <li key={`section:${section}`}>
                <h4
                  css={css`
                    margin: ${euiTheme.size.xs} 0 0;
                    padding-inline: ${inset} ${euiTheme.size.s};
                    color: ${GROUP_LABEL};
                    font-size: 11px;
                    font-weight: ${euiTheme.font.weight.semiBold};
                    letter-spacing: 0.08em;
                    line-height: ${ROW_HEIGHT}px;
                    text-transform: uppercase;
                  `}>
                  {section}
                </h4>
                <ul css={subList(ROW_GAP)} aria-label={section}>
                  {pageRows(listed)}
                </ul>
              </li>
            )
          )}
        </ul>
      ) : null}
    </Row>
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

/** The Gallery link and the config's apps with their pages, then primitives under collapsible groups, narrowed by a filter. */
export const StudioNav = ({
  mode,
  page,
  app,
  appPath = '',
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
  const appItems = useMemo(() => apps.map(appItem), [apps]);
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
  const plainList = css`
    display: flex;
    flex-direction: column;
    gap: ${ROW_GAP}px;
    margin: 0;
    padding: 0;
    list-style: none;
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
  const appRows = apps.map((entry) => (
    <AppRow
      key={entry.id}
      app={entry}
      openApp={app}
      {...{ appPath, filter, accent, onSelectApp }}
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
            <ul css={plainList}>
              {appRows}
              <Row
                item={GALLERY_ITEM}
                isActive={GALLERY === activePage}
                inset={euiTheme.size.m}
                {...{ accent, onSelect }}
              />
            </ul>
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
          </>
        ) : (
          <>
            <div css={rail}>
              {appItems.map((item) => (
                <RailEntry
                  key={item.id}
                  {...{ item, accent }}
                  onSelect={(id) => onSelectApp(id)}
                  isActive={item.id === app}
                />
              ))}
              <RailEntry
                item={GALLERY_ITEM}
                isActive={GALLERY === activePage}
                {...{ accent, onSelect }}
              />
            </div>
            {listed
              .flatMap((pack) => pack.groups)
              .map((group) => (
                <div key={group.key} css={rail}>
                  <EuiHorizontalRule margin="xs" />
                  {group.items.map((item) => (
                    <RailEntry
                      key={item.id}
                      {...{ item, accent, onSelect }}
                      isActive={item.id === activePage}
                    />
                  ))}
                </div>
              ))}
          </>
        )}
      </div>
    </nav>
  );
};
