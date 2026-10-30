/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement, ReactNode } from 'react';
import React, { useMemo, useState } from 'react';
import type { EuiListGroupItemProps, IconType } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldSearch,
  EuiHorizontalRule,
  EuiListGroup,
  EuiListGroupItem,
  EuiTitle,
  EuiToolTip,
  useEuiScrollBar,
  useEuiShadow,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';

import type { StudioApp, StudioAppPage } from '../config';
import { searchPrimitives } from '../model/search';
import { useStudio } from '../studio_context';

import { activeAppPage, appPageSections, filterAppPages } from './app_pages';
import { ComposeIcon } from './compose_icon';
import { useClosedNavGroups } from './nav_groups';
import { navPacks } from './nav_sections';
import { Glyph, PrimitiveGlyph } from './primitive_glyph';
import { PrimitivePeek } from './primitive_peek';
import { GALLERY } from './route';

export const NAV_WIDTH = {
  open: 272,
  closed: 72,
  compactAt: 1120,
} as const;

/** The edge of a glyph, matching `EuiIcon` at size `m`. */
const GLYPH_SIZE = 16;

export interface StudioNavProps {
  page: string;
  /** The open app's id; while one is open, no primitive is active. */
  app?: string | undefined;
  /** The open app's `path`, which picks its active page. */
  appPath?: string | undefined;
  /** True while the composition editor is open; no primitive is active then. */
  isComposing?: boolean | undefined;
  isOpen: boolean;
  isCompact?: boolean | undefined;
  onToggle: () => void;
  onCompose: () => void;
  onSelect: (page: string) => void;
  onSelectApp: (id: string, path?: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  /** An EUI icon, or a component drawing the entry's glyph. */
  iconType?: IconType | undefined;
  isPrimitive: boolean;
}

const GALLERY_ITEM: NavItem = {
  id: GALLERY,
  label: 'Gallery',
  iconType: 'grid',
  isPrimitive: false,
};

const COMPOSE_ITEM: NavItem = {
  id: 'compose',
  label: 'Composition',
  iconType: ComposeIcon,
  isPrimitive: false,
};

const appItem = ({ id, title, icon }: StudioApp): NavItem => ({
  id,
  label: title,
  iconType: () => <Glyph svg={icon?.svg} label={title} size={GLYPH_SIZE} />,
  isPrimitive: false,
});

const primitiveItem = (type: string, label: string): NavItem => ({
  id: type,
  label,
  iconType: () => <PrimitiveGlyph {...{ type }} size={GLYPH_SIZE} />,
  isPrimitive: true,
});

/** A primitive's tooltip previews it; an icon-only entry's names it. */
const toolTipOf = ({ id, label, isPrimitive }: NavItem) =>
  isPrimitive
    ? { title: label, content: <PrimitivePeek type={id} /> }
    : { content: label, disableScreenReaderOutput: true };

const Entry = ({
  item,
  isActive,
  onSelect,
}: {
  item: NavItem;
  isActive: boolean;
  onSelect: (id: string) => void;
}) => {
  const { id, label, iconType, isPrimitive } = item;
  const peek: Partial<EuiListGroupItemProps> = isPrimitive
    ? {
        showToolTip: true,
        toolTipProps: { position: 'right', ...toolTipOf(item) },
      }
    : {};
  return (
    <EuiListGroupItem
      {...{ label, isActive, ...peek }}
      {...(iconType ? { iconType } : {})}
      aria-current={isActive ? 'page' : undefined}
      onClick={() => onSelect(id)}
    />
  );
};

const RailEntry = ({
  item,
  isActive,
  onSelect,
}: {
  item: NavItem;
  isActive: boolean;
  onSelect: (id: string) => void;
}) => (
  <EuiToolTip position="right" {...toolTipOf(item)}>
    <EuiButtonIcon
      display={isActive ? 'base' : 'empty'}
      color={isActive ? 'primary' : 'text'}
      size="s"
      iconType={item.iconType ?? 'empty'}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
      onClick={() => onSelect(item.id)}
    />
  </EuiToolTip>
);

/** Lists entries with the theme's gap between rows, inset by `indent` from the nav's edge. */
const NavList = ({
  indent,
  children,
  ...rest
}: {
  indent?: string | undefined;
  'aria-label'?: string;
  children: ReactNode;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiListGroup
      maxWidth={false}
      css={css`
        gap: ${euiTheme.size.xs};
        padding-inline-start: ${indent ?? 0};
      `}
      {...rest}>
      {children}
    </EuiListGroup>
  );
};

/** A titled run of an app's pages, as one item of its page list. */
const PageSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <li>
    <EuiTitle size="xxxs" textTransform="uppercase">
      <h4>{title}</h4>
    </EuiTitle>
    <NavList aria-label={title}>{children}</NavList>
  </li>
);

/** An app's entry, then its pages in their sections. */
const AppEntry = ({
  app,
  openApp,
  appPath,
  filter,
  onSelectApp,
}: {
  app: StudioApp;
  /** The open app's id. */
  openApp: string | undefined;
  appPath: string;
  filter: string;
  onSelectApp: (id: string, path?: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const { id, title, pages = [] } = app;
  const item = useMemo(() => appItem(app), [app]);
  const isOpen = openApp === id;
  const active = isOpen ? activeAppPage(pages, appPath) : undefined;
  const sections = appPageSections(filterAppPages(pages, filter));
  const entries = (listed: readonly StudioAppPage[]): ReactElement[] =>
    listed.map(({ path, title: label }) => (
      <Entry
        key={path}
        item={{ id: path, label, isPrimitive: false }}
        isActive={active?.path === path}
        onSelect={(next) => onSelectApp(id, next)}
      />
    ));

  return (
    <>
      <NavList>
        <Entry
          {...{ item }}
          isActive={isOpen && active === undefined}
          onSelect={() => onSelectApp(id)}
        />
      </NavList>
      {sections.length ? (
        <NavList
          aria-label={`${title} pages`}
          indent={`calc(${GLYPH_SIZE}px + ${euiTheme.size.s})`}>
          {sections.flatMap(({ title: section, pages: listed }) =>
            section === undefined
              ? entries(listed)
              : [
                  <PageSection key={`section:${section}`} title={section}>
                    {entries(listed)}
                  </PageSection>,
                ]
          )}
        </NavList>
      ) : null}
    </>
  );
};

/** A heading whose button shows and hides the group's entries, per the WAI-ARIA disclosure pattern. */
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
  const id = useGeneratedHtmlId({ prefix: 'navGroup' });
  return (
    <div>
      <EuiTitle size="xxxs">
        <h3>
          <EuiButtonEmpty
            size="xs"
            color="text"
            flush="left"
            iconType={isOpen ? 'chevronSingleDown' : 'chevronSingleRight'}
            aria-expanded={isOpen}
            {...(isOpen ? { 'aria-controls': id } : {})}
            onClick={onToggle}>
            {title}
          </EuiButtonEmpty>
        </h3>
      </EuiTitle>
      {isOpen ? <div {...{ id }}>{children}</div> : null}
    </div>
  );
};

/**
 * The config's apps with their pages, the composition editor and Gallery links, then primitives
 * under collapsible groups, narrowed by a filter.
 */
export const StudioNav = ({
  page,
  app,
  appPath = '',
  isComposing = false,
  isOpen,
  isCompact = false,
  onToggle,
  onCompose,
  onSelect,
  onSelectApp,
}: StudioNavProps) => {
  const { euiTheme } = useEuiTheme();
  const scrollbar = useEuiScrollBar();
  const overlayShadow = useEuiShadow('l');
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
          return doc ? [primitiveItem(type, doc.label)] : [];
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
    ${
      isCompact
        ? css`
            position: absolute;
            inset-block: 0;
            inset-inline-start: 0;
            z-index: 1;
            inline-size: ${isOpen ? NAV_WIDTH.open : NAV_WIDTH.closed}px;
            background: ${
              isOpen ? euiTheme.colors.backgroundBasePlain : 'transparent'
            };
            border-inline-end: ${isOpen ? euiTheme.border.thin : 'none'};
            ${isOpen ? overlayShadow : ''};
            transition: inline-size ${euiTheme.animation.normal}
              ${euiTheme.animation.resistance};
          `
        : ''
    }
  `;
  const toolbar = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    flex: none;
    margin-inline: ${euiTheme.size.s};
    margin-block-end: ${euiTheme.size.s};
    min-block-size: ${euiTheme.size.xl};
    justify-content: ${isOpen ? 'flex-start' : 'center'};
  `;
  const scroller = css`
    flex: 1;
    min-block-size: 0;
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.s};
    padding-inline: ${isOpen ? euiTheme.size.s : 0};
    overflow: hidden auto;
    ${scrollbar}
  `;
  const rail = css`
    flex: none;
    inline-size: ${NAV_WIDTH.closed}px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${euiTheme.size.xs};
  `;
  const activePage = app === undefined && !isComposing ? page : undefined;
  const toggleLabel = `${isOpen ? 'Collapse' : 'Expand'} primitive navigation`;

  return (
    <nav css={column} aria-label="Primitives">
      <div css={toolbar}>
        {isOpen ? (
          <div
            css={css`
              flex: 1;
              min-inline-size: 0;
            `}>
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
        <EuiButtonIcon
          display="empty"
          size="s"
          color="text"
          css={css`
            flex: none;
          `}
          iconType={isOpen ? 'transitionRightIn' : 'transitionLeftIn'}
          aria-label={toggleLabel}
          title={toggleLabel}
          aria-expanded={isOpen}
          onClick={onToggle}
        />
      </div>
      <div css={scroller}>
        {isOpen ? (
          <>
            {apps.map((entry) => (
              <AppEntry
                key={entry.id}
                app={entry}
                openApp={app}
                {...{ appPath, filter, onSelectApp }}
              />
            ))}
            <NavList>
              <Entry
                item={COMPOSE_ITEM}
                isActive={isComposing}
                onSelect={onCompose}
              />
              <Entry
                item={GALLERY_ITEM}
                isActive={GALLERY === activePage}
                {...{ onSelect }}
              />
            </NavList>
            {listed.map((pack) => (
              <React.Fragment key={pack.id}>
                {separatePacks ? (
                  <EuiTitle size="xxxs" textTransform="uppercase">
                    <h2>{pack.label}</h2>
                  </EuiTitle>
                ) : null}
                {pack.groups.map((group) => (
                  <Group
                    key={group.key}
                    title={group.title}
                    isOpen={isGroupOpen(group.key)}
                    onToggle={() => toggleGroup(group.key)}>
                    <NavList indent={euiTheme.size.s}>
                      {group.items.map((item) => (
                        <Entry
                          key={item.id}
                          {...{ item, onSelect }}
                          isActive={item.id === activePage}
                        />
                      ))}
                    </NavList>
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
                  {...{ item }}
                  onSelect={(id) => onSelectApp(id)}
                  isActive={item.id === app}
                />
              ))}
              <RailEntry
                item={COMPOSE_ITEM}
                isActive={isComposing}
                onSelect={onCompose}
              />
              <RailEntry
                item={GALLERY_ITEM}
                isActive={GALLERY === activePage}
                {...{ onSelect }}
              />
            </div>
            {listed
              .flatMap((pack) => pack.groups)
              .map((group) => (
                <div key={group.key} css={rail}>
                  <EuiHorizontalRule margin="xs" size="quarter" />
                  {group.items.map((item) => (
                    <RailEntry
                      key={item.id}
                      {...{ item, onSelect }}
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
