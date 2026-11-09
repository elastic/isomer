/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const frame = {
  /** The page width of `chartsFrame`, in pixels. */
  width: 960,
  padding: 16,
  gap: 16,
  /** The page title size, in pixels. */
  title: 20,
  /** The page subtitle size, in pixels. */
  subtitle: 14,
} as const;

/**
 * The one authoring source for every length the pack's own containers draw.
 * Colors are not here: chart colors come from the Scene, and container chrome
 * inherits the page's text color.
 */
export const CHARTS_THEME = {
  frame,
  grid: {
    /** Height of one grid row unit, in pixels. */
    rowHeight: 20,
    /** Space between panels, in pixels. */
    gap: 8,
    /** Space between a section title and its panels, in pixels. */
    sectionGap: 16,
    /**
     * The width a grid lays out for when the host gives none, in pixels:
     * `chartsFrame`'s content, so a grid on `snapshot` fits its page.
     */
    nominalWidth: frame.width - 2 * frame.padding,
    /** Height of a panel header with a title, in pixels. */
    headerHeight: 24,
    /** Height of a grid or panel description line, in pixels. */
    descriptionHeight: 18,
  },
  type: {
    /** Panel and section title size, in pixels. */
    title: 14,
    /** Description and reason size, in pixels. */
    body: 12,
  },
  unsupported: {
    padding: 12,
    borderWidth: 1,
    /** Height a `snapshot` frame reserves for an unsupported node, in pixels. */
    height: 96,
  },
} as const;
