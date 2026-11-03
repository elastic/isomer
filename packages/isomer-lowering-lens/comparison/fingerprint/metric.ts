/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MetricTileFingerprint {
  /** `[row, column]` in the chart's grid. */
  position: [number, number];
  box: Box;
  background: string;
  title?: string;
  subtitle?: string;
  /** Extra text below the value when there is no secondary metric. */
  extra?: string;
  value: string;
  valueColor: string;
  valueFontSize: number;
  /** Drawn widths of the text runs, which differ when a font is substituted. */
  valueWidth: number;
  /** The drawn width of the runs Kibana's numeric font face does not cover. */
  valueLetterWidth: number;
  titleFontSize?: number;
  titleWidth?: number;
  titleLetterWidth?: number;
  /** Where each text sits in its block as drawn: `left`, `right`, `center` or `offset`. */
  titlesAlign?: string;
  valueAlign?: string;
  extraAlign?: string;
  /** Which side of the tile the icon is drawn on. */
  iconAlign?: string;
  secondary?: {
    label?: string;
    value?: string;
    badge?: { background: string; color: string };
  };
  progress?: {
    now: number;
    min: number;
    max: number;
    color: string;
    orientation: 'horizontal' | 'vertical';
    /** Where the painted bar starts and ends along the track, from its left or bottom, as fractions of it. */
    start: number;
    end: number;
  };
  /** Each subpath of the sparkline's area, as flat `[x, y, …]` in its unit `viewBox`. */
  trend?: { color: string; paths: number[][] };
}

export interface MetricFingerprint {
  kind: 'metric';
  width: number;
  height: number;
  tiles: MetricTileFingerprint[];
  /** Grid cells Elastic Charts left empty. */
  empty: number;
}

/** Kibana's `Elastic UI Numeric` `unicode-range`: U+20, U+24-25, U+28-29, U+2B-2F, U+30-3A, U+A0, U+202F, U+2212. */
export const NUMERIC_GLYPHS =
  /[\x20\x24\x25\x28\x29\x2b-\x2f\x30-\x3a\xa0\u202f\u2212]/;

/**
 * Reads an Elastic Charts `Metric` drawing under `root`. It references nothing outside its body, so Playwright
 * can serialize it into any page; `numericGlyphs` is {@link NUMERIC_GLYPHS}'s source.
 */
export const extractMetricFingerprint = (
  root: Element,
  numericGlyphs: string
): MetricFingerprint | null => {
  const container = root.matches('.echMetricContainer')
    ? root
    : root.querySelector('.echMetricContainer');
  if (!container) {
    return null;
  }
  const origin = container.getBoundingClientRect();
  const round = (value: number, places = 2) => {
    const scale = 10 ** places;
    return Math.round(value * scale) / scale;
  };
  const hex = (css: string) => {
    const match = /rgba?\(([^)]+)\)/.exec(css);
    if (!match) {
      return css.trim().toLowerCase();
    }
    const [r, g, b, a] = match[1]!
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    const part = (n: number) => Math.round(n).toString(16).padStart(2, '0');
    const alpha = a === undefined || a >= 1 ? '' : part(a * 255);
    return `#${part(r!)}${part(g!)}${part(b!)}${alpha}`;
  };
  const text = (element: Element | null) => {
    if (!element) {
      return undefined;
    }
    const shown =
      (element as HTMLElement).innerText ?? element.textContent ?? '';
    const collapsed = shown.replace(/\s+/g, ' ').trim();
    return collapsed || undefined;
  };
  const px = (element: Element | null) =>
    element ? round(parseFloat(getComputedStyle(element).fontSize)) : undefined;
  const textNodes = (element: Element | null) => {
    const walker =
      element && document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker?.nextNode()) {
      nodes.push(walker.currentNode as Text);
    }
    return nodes;
  };
  // Spans only the text nodes, so a block or clamped wrapper's box does not count as text.
  const extentOf = (element: Element | null) => {
    const nodes = textNodes(element);
    if (!nodes.length) {
      return undefined;
    }
    const range = document.createRange();
    range.setStart(nodes[0]!, 0);
    range.setEnd(nodes.at(-1)!, nodes.at(-1)!.length);
    return range.getBoundingClientRect();
  };
  const extent = (element: Element | null) =>
    round(extentOf(element)?.width ?? 0);
  const numeric = new RegExp(numericGlyphs);
  const letterWidth = (element: Element | null) => {
    let total = 0;
    for (const node of textNodes(element)) {
      let start = -1;
      for (let index = 0; index <= node.data.length; index += 1) {
        const letter =
          index < node.data.length && !numeric.test(node.data[index]!);
        if (letter && start < 0) {
          start = index;
        } else if (!letter && start >= 0) {
          const range = document.createRange();
          range.setStart(node, start);
          range.setEnd(node, index);
          total += range.getBoundingClientRect().width;
          start = -1;
        }
      }
    }
    return round(total);
  };
  // Within a pixel of an edge is at it, which absorbs subpixel rounding. A text that fills its block shows
  // no alignment, so its block's and its own computed alignment stand in.
  const alignment = (
    block: Element | null,
    content: Element | null,
    shown: DOMRect | undefined = extentOf(content)
  ) => {
    if (!block || !content || !shown?.width) {
      return undefined;
    }
    const box = block.getBoundingClientRect();
    const style = getComputedStyle(block);
    const left = shown.left - box.left - parseFloat(style.paddingLeft);
    const right = box.right - parseFloat(style.paddingRight) - shown.right;
    if (left <= 1 && right <= 1) {
      const justify = style.justifyContent;
      const align = getComputedStyle(content).textAlign;
      return /end|right/.test(justify)
        ? 'right'
        : justify === 'center'
          ? 'center'
          : /end|right/.test(align)
            ? 'right'
            : align === 'center'
              ? 'center'
              : 'left';
    }
    return left <= 1
      ? 'left'
      : right <= 1
        ? 'right'
        : Math.abs(left - right) <= 1
          ? 'center'
          : 'offset';
  };

  // An empty grid cell is an `.echMetric` too, but only a drawn tile is a figure.
  const drawn = [...container.querySelectorAll('.echMetric[role="figure"]')];
  const tiles = drawn.map((tile): MetricTileFingerprint => {
    const id = tile.getAttribute('aria-labelledby') ?? '';
    const [, row = '0', column = '0'] = /-(\d+)-(\d+)$/.exec(id) ?? [];
    const box = tile.getBoundingClientRect();
    const titleText = tile.querySelector('.echMetricText__title');
    const valueText = tile.querySelector('.echMetricText__value');
    const titles = tile.querySelector('.echMetricText__titlesBlock');
    const valueBlock = tile.querySelector('.echMetricText__valueBlock');
    const extraBlock = tile.querySelector('.echMetricText__extraBlock');
    const icon = tile.querySelector('.echMetricText__icon');
    const fingerprint: MetricTileFingerprint = {
      position: [Number(row), Number(column)],
      box: {
        x: round(box.x - origin.x),
        y: round(box.y - origin.y),
        width: round(box.width),
        height: round(box.height),
      },
      background: hex(getComputedStyle(tile).backgroundColor),
      value: text(valueText) ?? '',
      valueColor: hex(valueText ? getComputedStyle(valueText).color : ''),
      valueFontSize: px(valueText) ?? 0,
      valueWidth: extent(valueText),
      valueLetterWidth: letterWidth(valueText),
    };
    const title = text(titleText);
    if (titleText && title !== undefined) {
      fingerprint.title = title;
      fingerprint.titleFontSize = px(
        titleText.querySelector('span') ?? titleText
      )!;
      fingerprint.titleWidth = extent(titleText);
      fingerprint.titleLetterWidth = letterWidth(titleText);
    }
    const subtitle = text(tile.querySelector('.echMetricText__subtitle'));
    if (subtitle !== undefined) {
      fingerprint.subtitle = subtitle;
    }
    const extra = text(tile.querySelector('.echMetricText__extra'));
    if (extra !== undefined) {
      fingerprint.extra = extra;
    }
    // A secondary metric is measured by its own box, which includes a badge's padding.
    const extraContent =
      extraBlock?.querySelector('.echSecondaryMetric') ??
      extraBlock?.querySelector('.echMetricText__extra') ??
      null;
    const placements: [
      keyof MetricTileFingerprint,
      Element | null,
      Element | null,
      DOMRect | undefined,
    ][] = [
      ['titlesAlign', titles, titleText, extentOf(titleText)],
      ['valueAlign', valueBlock, valueText, extentOf(valueText)],
      [
        'extraAlign',
        extraBlock,
        extraContent,
        extraContent?.matches('.echSecondaryMetric')
          ? extraContent.getBoundingClientRect()
          : extentOf(extraContent),
      ],
    ];
    for (const [key, block, content, shown] of placements) {
      const align = alignment(block, content, shown);
      if (align !== undefined) {
        (fingerprint as unknown as Record<string, string>)[key] = align;
      }
    }
    if (icon) {
      // The icon wrapper stretches across the row; the glyph inside it is what moves.
      const drawnIcon = (
        icon.querySelector('svg, img') ??
        icon.firstElementChild ??
        icon
      ).getBoundingClientRect();
      fingerprint.iconAlign =
        drawnIcon.left + drawnIcon.width / 2 < box.left + box.width / 2
          ? 'left'
          : 'right';
    }
    const secondary = tile.querySelector('.echSecondaryMetric');
    if (secondary) {
      // The value is a badge when Lens colors it, and plain text otherwise.
      const shown = secondary.querySelector('.echSecondaryMetric__value');
      const badgeText = shown?.querySelector('.echBadge__text');
      const badge = badgeText ? shown : null;
      const label = text(secondary.querySelector('.echSecondaryMetric__label'));
      const value = text(badgeText ?? shown);
      fingerprint.secondary = {
        ...(label === undefined ? {} : { label }),
        ...(value === undefined ? {} : { value }),
        ...(badge
          ? {
              badge: {
                background: hex(getComputedStyle(badge).backgroundColor),
                color: hex(getComputedStyle(badge).color),
              },
            }
          : {}),
      };
    }
    const meter = tile.querySelector('[role="meter"]');
    if (meter) {
      const fill = meter.firstElementChild ?? meter;
      const track = (
        meter.closest('.echMeter') ?? meter
      ).getBoundingClientRect();
      const bar = meter.getBoundingClientRect();
      const vertical = Boolean(meter.closest('.echMeter--vertical'));
      const along = (from: number) =>
        vertical
          ? round((track.bottom - from) / (track.height || 1), 4)
          : round((from - track.left) / (track.width || 1), 4);
      fingerprint.progress = {
        now: Number(meter.getAttribute('aria-valuenow')),
        min: Number(meter.getAttribute('aria-valuemin')),
        max: Number(meter.getAttribute('aria-valuemax')),
        color: hex(getComputedStyle(fill).backgroundColor),
        orientation: vertical ? 'vertical' : 'horizontal',
        start: along(vertical ? bar.bottom : bar.left),
        end: along(vertical ? bar.top : bar.right),
      };
    }
    const sparkline = tile.querySelector('.echSingleMetricSparkline__svg');
    if (sparkline) {
      const path = sparkline.querySelector('path');
      const d = path?.getAttribute('d') ?? '';
      const paths = d
        .split(/(?=M)/)
        .map((segment) =>
          (segment.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map((n) =>
            round(Number(n), 4)
          )
        )
        .filter((points) => points.length);
      fingerprint.trend = {
        color: hex(path ? getComputedStyle(path).fill : ''),
        paths,
      };
    }
    return fingerprint;
  });
  const bounds = container.getBoundingClientRect();
  return {
    kind: 'metric',
    width: round(bounds.width),
    height: round(bounds.height),
    tiles: tiles.sort(
      ({ position: [ra, ca] }, { position: [rb, cb] }) => ra - rb || ca - cb
    ),
    empty: container.querySelectorAll(':scope > li').length - drawn.length,
  };
};
