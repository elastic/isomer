/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiCollapsibleNavGroup,
  EuiFieldSearch,
  EuiHorizontalRule,
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  useEuiScrollBar,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { searchPrimitives } from '../model/search';
import { useStudio } from '../studio_context';

import type { Accent } from './accent';
import { useClosedNavGroups } from './nav_groups';
import { navPacks } from './nav_sections';
import { PrimitivePeek } from './primitive_peek';
import { PrimitiveTile } from './primitive_tile';
import type { StudioMode } from './route';
import { GALLERY } from './route';

export const NAV_WIDTH = { open: 232, closed: 52 } as const;

export interface StudioNavProps {
  mode: StudioMode;
  page: string;
  accent: Accent;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (page: string) => void;
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
  onSelect,
}: {
  item: NavItem;
  isActive: boolean;
  onSelect: (page: string) => void;
}) => {
  const { id, label, icon } = item;
  return withPeek(
    item,
    <EuiButtonIcon
      display={isActive ? 'base' : 'empty'}
      color="text"
      iconType={() => icon}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      onClick={() => onSelect(id)}
    />
  );
};

/** Primitives under collapsible groups, narrowed by a filter, and the docs-only views. */
export const StudioNav = ({
  mode,
  page,
  accent,
  isOpen,
  onSelect,
}: StudioNavProps) => {
  const { euiTheme } = useEuiTheme();
  const scrollbar = useEuiScrollBar();
  const {
    runtime,
    docs: { primitives },
  } = useStudio();
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
                  icon: <PrimitiveTile {...{ type }} />,
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
        icon: <EuiIcon type="grid" aria-hidden={true} />,
        isPrimitive: false,
      },
    ];
  }, [mode]);

  const column = css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.xs};
    min-block-size: 0;
    padding-block: ${euiTheme.size.m};
    background: ${accent.shell};
    overflow: hidden;
    transition: background ${euiTheme.animation.normal}
      ${euiTheme.animation.resistance};
  `;
  const fieldInset = css`
    flex: none;
    margin-inline: ${euiTheme.size.base};
  `;
  const scroller = css`
    flex: 1;
    min-block-size: 0;
    overflow: hidden auto;
    ${scrollbar}
  `;
  const rail = css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${euiTheme.size.xxs};
  `;
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
            {listed.map((pack) => (
              <React.Fragment key={pack.id}>
                {separatePacks ? (
                  <EuiCollapsibleNavGroup title={pack.label} />
                ) : null}
                {pack.groups.map((group) => (
                  <EuiCollapsibleNavGroup
                    key={group.key}
                    title={group.title}
                    isCollapsible={true}
                    forceState={
                      filter || !closed.has(group.key) ? 'open' : 'closed'
                    }
                    onToggle={(isGroupOpen) =>
                      !filter && setOpen(group.key, isGroupOpen)
                    }>
                    <EuiListGroup maxWidth={false}>
                      {group.items.map((item) => (
                        <EuiListGroupItem
                          key={item.id}
                          label={withPeek(item, <span>{item.label}</span>)}
                          icon={item.icon}
                          isActive={item.id === page}
                          aria-current={item.id === page ? 'page' : undefined}
                          color="text"
                          onClick={() => onSelect(item.id)}
                        />
                      ))}
                    </EuiListGroup>
                  </EuiCollapsibleNavGroup>
                ))}
              </React.Fragment>
            ))}
            {gallery.length ? (
              <EuiCollapsibleNavGroup
                title="Views"
                isCollapsible={true}
                forceState={filter || !closed.has('Views') ? 'open' : 'closed'}
                onToggle={(isGroupOpen) =>
                  !filter && setOpen('Views', isGroupOpen)
                }>
                <EuiListGroup maxWidth={false}>
                  {gallery.map((item) => (
                    <EuiListGroupItem
                      key={item.id}
                      label={item.label}
                      icon={item.icon}
                      isActive={item.id === page}
                      aria-current={item.id === page ? 'page' : undefined}
                      color="text"
                      onClick={() => onSelect(item.id)}
                    />
                  ))}
                </EuiListGroup>
              </EuiCollapsibleNavGroup>
            ) : null}
          </>
        ) : (
          [
            ...listed.flatMap((pack) => pack.groups),
            ...(gallery.length ? [{ key: 'Views', items: gallery }] : []),
          ].map((group, index) => (
            <div key={group.key} css={rail}>
              {index > 0 ? <EuiHorizontalRule margin="xs" /> : null}
              {group.items.map((item) => (
                <RailEntry
                  key={item.id}
                  {...{ item, onSelect }}
                  isActive={item.id === page}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </nav>
  );
};
