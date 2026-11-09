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
  /**
   * How a chart sizes itself outside a sized container, as Lens's chart size
   * specs do. A grid panel or a host `size` overrides it.
   */
  chart: {
    /** The width a chart lays out for on Node, where there is no container to fill, in pixels. */
    width: 480,
    xy: {
      /** Width to height. Lens uses it for a vertical time chart and fills a container otherwise. */
      aspectRatio: { x: 16, y: 9 },
      /** The least height of a vertical time chart, in pixels. */
      timeMinHeight: 300,
    },
    gauge: {
      /**
       * Lens's gauge size specs by shape (`useGaugeSizeByType`): width to
       * height, and the greatest width. A bullet takes the box of its largest
       * size, which Lens fills.
       */
      horizontalBullet: { aspectRatio: { x: 3, y: 1 }, maxWidth: 600 },
      verticalBullet: { aspectRatio: { x: 2, y: 3 }, maxWidth: 400 },
      semiCircle: { aspectRatio: { x: 2, y: 1.25 }, maxWidth: 600 },
      arc: { aspectRatio: { x: 1.1, y: 1 }, maxWidth: 600 },
      circle: { aspectRatio: { x: 1, y: 1 }, maxWidth: 600 },
    },
    tagCloud: {
      /**
       * Width to height. Lens gives a tag cloud no size spec and fills its
       * container, so outside one it takes the xy chart's shape.
       */
      aspectRatio: { x: 16, y: 9 },
    },
    legacyMetric: {
      /**
       * Width to height. Lens gives a legacy metric no size spec and fills its
       * container, so outside one it takes the xy chart's shape, growing
       * taller when its tiles wrap to more rows than fit.
       */
      aspectRatio: { x: 16, y: 9 },
    },
    heatmap: {
      /**
       * Width to height. Lens gives a heat map no size spec and fills its
       * container, so outside one it takes the xy chart's shape.
       */
      aspectRatio: { x: 16, y: 9 },
    },
    partition: {
      /**
       * Width to height. Lens gives a partition chart no size spec and fills
       * its container, so outside one it takes the xy chart's shape.
       */
      aspectRatio: { x: 16, y: 9 },
    },
    metric: {
      /** The largest box of a metric with one tile, in pixels. */
      single: { width: 300, height: 160 },
      /** The largest side of each tile when there are several, in pixels. */
      tileSide: 200,
    },
    /** Height of the line a chart's link draws on below the chart, in pixels. */
    linkHeight: 18,
  },
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
    /** Description, reason and link size, in pixels. */
    body: 12,
  },
  /** A `dataTable`, laid out as EUI's data grid. */
  table: {
    /** Type size, cell padding and row height per density, in pixels. */
    density: {
      compact: { font: 12, padding: 4, rowHeight: 24 },
      default: { font: 14, padding: 6, rowHeight: 32 },
      expanded: { font: 16, padding: 8, rowHeight: 40 },
    },
    lineWidth: 1,
    headerWeight: 700,
    /** A bar's thickness as a share of the row height. */
    barThickness: 0.3,
    barGap: 6,
    /** The least width a bar's value takes, in `ch`. */
    barLabelMinChars: 3,
    badgePadding: 4,
    badgeRadius: 3,
    pageGap: 12,
    /** Height of the title line, in pixels. */
    titleHeight: 24,
    /** Height of a description, note or link line, in pixels. */
    lineHeight: 18,
  },
  unsupported: {
    padding: 12,
    borderWidth: 1,
    /** Height a `snapshot` frame reserves for an unsupported node, in pixels. */
    height: 96,
  },
} as const;
