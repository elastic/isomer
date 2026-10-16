/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiButtonEmpty, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const PAGE_WIDTH = 1320;
export const CONTENT_BASIS = 560;
const TOC_WIDTH = 180;
export const TOC_GAP = 48;

export interface TocEntry {
  /** The `id` of the element the entry scrolls to. */
  id: string;
  title: string;
}

/** The id of the topmost element in view, or the first when the browser can't observe intersections. */
export const useActiveEntry = (
  ids: readonly string[],
  resetKey: string
): [string, (id: string) => void] => {
  const [active, setActive] = useState(ids[0] ?? '');

  useEffect(() => {
    setActive(ids[0] ?? '');
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target: { id }, isIntersecting }) =>
          isIntersecting ? visible.add(id) : visible.delete(id)
        );
        const first = ids.find((id) => visible.has(id));
        if (first) {
          setActive(first);
        }
      },
      { rootMargin: '0px 0px -60% 0px' }
    );
    ids.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });
    return () => observer.disconnect();
  }, [ids, resetKey]);

  return [active, setActive];
};

/** A sticky "On this page" gutter that scrolls to each entry's element. */
export const OnThisPage = ({
  entries,
  active,
  onSelect,
}: {
  entries: readonly TocEntry[];
  active: string;
  onSelect: (id: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <nav
      aria-label="On this page"
      css={css`
        flex: 0 0 ${TOC_WIDTH}px;
        position: sticky;
        top: ${euiTheme.size.xl};
        height: fit-content;
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.xxs};
      `}>
      <EuiText
        size="xs"
        color="subdued"
        css={css`
          text-transform: uppercase;
          font-weight: ${euiTheme.font.weight.semiBold};
        `}>
        On this page
      </EuiText>
      {entries.map(({ id, title }) => (
        <EuiButtonEmpty
          key={id}
          size="xs"
          flush="left"
          color={id === active ? 'primary' : 'text'}
          aria-current={id === active ? 'location' : undefined}
          css={css`
            align-self: flex-start;
          `}
          onClick={() => {
            onSelect(id);
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
          }}>
          {title}
        </EuiButtonEmpty>
      ))}
    </nav>
  );
};
