/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StudioAppPage } from '../config';

export interface AppPageSection {
  /** Absent for the pages that name no `section`. */
  title?: string | undefined;
  pages: StudioAppPage[];
}

/** `pages` grouped by `section`: unsectioned pages first, then sections in order of first appearance. */
export const appPageSections = (
  pages: readonly StudioAppPage[]
): AppPageSection[] => {
  const sections = new Map<string | undefined, AppPageSection>([
    [undefined, { title: undefined, pages: [] }],
  ]);
  for (const page of pages) {
    const { section: title } = page;
    const section = sections.get(title) ?? { title, pages: [] };
    section.pages.push(page);
    sections.set(title, section);
  }
  return [...sections.values()].filter(({ pages: listed }) => listed.length);
};

/** The page `path` is at or below, the longest such page winning. */
export const activeAppPage = (
  pages: readonly StudioAppPage[],
  path: string
): StudioAppPage | undefined =>
  pages.reduce<StudioAppPage | undefined>(
    (best, page) =>
      (path === page.path || path.startsWith(`${page.path}/`)) &&
      page.path.length > (best?.path.length ?? -1)
        ? page
        : best,
    undefined
  );

/** Pages whose title contains every word of `query`. */
export const filterAppPages = (
  pages: readonly StudioAppPage[],
  query: string
): StudioAppPage[] => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return pages.filter(({ title }) => {
    const text = title.toLowerCase();
    return words.every((word) => text.includes(word));
  });
};
