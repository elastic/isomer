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

/** An element a tile paints: what it draws, where, and in which style. */
export interface DrawnElement {
  /** Relative to the tile; only for an element that paints a fill, border or shape. */
  box?: Box;
  /** Set when that box is sized around text, so it moves with how the platform rasterizes text. */
  holdsText?: true;
  /** The element's own text, not its descendants'. */
  text?: string;
  /** Where that text is drawn, relative to the tile. */
  textRect?: Box;
  /** The part of that text its clipping ancestors leave visible; only under one. */
  visibleRect?: Box;
  /** Set when clipping leaves none of the element visible. */
  hidden?: true;
  /** An SVG shape's geometry, numbers rounded to two places. */
  shape?: string;
  style: Record<string, string>;
}

export interface MetricTileFingerprint {
  /** `[row, column]` in the chart's grid. */
  position: [number, number];
  box: Box;
  /** Elastic Charts draws a clickable tile's title as a button. */
  interactive: boolean;
  /** The readings, for checking the drawing against the resolved model. */
  title?: string;
  subtitle?: string;
  /** Extra text below the value when there is no secondary metric. */
  extra?: string;
  value: string;
  secondary?: { label?: string; value?: string };
  progress?: { now: number; min: number; max: number };
  /** Each subpath of the sparkline's area, as flat `[x, y, …]` in its unit `viewBox`. */
  trend?: { paths: number[][] };
  /** Every element the tile paints, keyed by its place among Elastic Charts' classes. Opacity, filters, clips and blending its wrappers apply are recorded on it. */
  elements: Record<string, DrawnElement>;
}

export interface MetricFingerprint {
  kind: 'metric';
  width: number;
  height: number;
  tiles: MetricTileFingerprint[];
  /** Grid cells Elastic Charts left empty. */
  empty: number;
}

/**
 * Reads an Elastic Charts `Metric` drawing under `root`. It references nothing outside its body, so Playwright
 * can serialize it into any page.
 */
export const extractMetricFingerprint = (
  root: Element
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
  const relative = (rect: Box, to: Box): Box => ({
    x: round(rect.x - to.x),
    y: round(rect.y - to.y),
    width: round(rect.width),
    height: round(rect.height),
  });
  const intersect = (a: Box, b: Box): Box => {
    const x = Math.max(a.x, b.x);
    const y = Math.max(a.y, b.y);
    return {
      x,
      y,
      width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - x),
      height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - y),
    };
  };
  const empty = ({ width, height }: Box) => width <= 0 || height <= 0;
  const transparent = (color: string) =>
    color === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(color);
  // What paints a box: a fill or border, a shape, an image, or the progress meter.
  const SHAPES: Record<string, readonly string[]> = {
    path: ['d'],
    polygon: ['points'],
    polyline: ['points'],
    rect: ['x', 'y', 'width', 'height', 'rx', 'ry'],
    circle: ['cx', 'cy', 'r'],
    ellipse: ['cx', 'cy', 'rx', 'ry'],
    line: ['x1', 'y1', 'x2', 'y2'],
  };
  const SIDES = ['Top', 'Right', 'Bottom', 'Left'] as const;
  const bordered = (style: CSSStyleDeclaration) =>
    SIDES.some(
      (side) =>
        parseFloat(
          style.getPropertyValue(`border-${side.toLowerCase()}-width`)
        ) > 0 &&
        !transparent(
          style.getPropertyValue(`border-${side.toLowerCase()}-color`)
        )
    );
  const paints = (element: Element, style: CSSStyleDeclaration) =>
    !transparent(style.backgroundColor) ||
    bordered(style) ||
    style.boxShadow !== 'none' ||
    element.tagName.toLowerCase() in SHAPES ||
    ['svg', 'img'].includes(element.tagName.toLowerCase()) ||
    element.getAttribute('role') === 'meter';
  // One value when every side shares it, else all four.
  const sides = (read: (side: string) => string) => {
    const values = SIDES.map((side) => read(side.toLowerCase()));
    return new Set(values).size === 1 ? values[0]! : values.join(' ');
  };
  // Geometry CSS sets, such as `d: path(…)`, overrides the attribute.
  const geometry = (element: Element, style: CSSStyleDeclaration) =>
    (SHAPES[element.tagName.toLowerCase()] ?? [])
      .map((name) => {
        const css = style.getPropertyValue(name);
        const drawn =
          css && css !== 'auto' && css !== 'none'
            ? css
            : (element.getAttribute(name) ?? '');
        // Path data may run numbers together, as in `0.36.08`; each is spaced apart once rounded.
        const value = drawn
          .replace(
            /-?\d*\.?\d+(?:e[-+]?\d+)?/gi,
            (n) => ` ${round(Number(n))} `
          )
          .replace(/\s+/g, ' ')
          .trim();
        return `${name}=${value}`;
      })
      .join('; ');
  // Compositing a wrapper applies to everything under it, whether or not it paints.
  const EFFECTS = [
    ['filter', 'none'],
    ['clip-path', 'none'],
    ['mix-blend-mode', 'normal'],
  ] as const;
  const nameOf = (element: Element) =>
    [...element.classList].find(
      (name) => name.startsWith('ech') && !name.includes('--')
    ) ?? element.tagName.toLowerCase();

  const readElements = (tile: Element) => {
    const tileBox = tile.getBoundingClientRect();
    const elements: Record<string, DrawnElement> = {};
    interface Inherited {
      /** The viewport area every clipping ancestor so far leaves visible. */
      clip?: Box | undefined;
      opacity: number;
      effects: string[];
    }
    const walk = (element: Element, path: string, inherited: Inherited) => {
      const { clip } = inherited;
      const style = getComputedStyle(element);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        element.matches('.echScreenReaderOnly')
      ) {
        return;
      }
      const own = [...element.childNodes].filter(
        (node): node is Text =>
          node.nodeType === Node.TEXT_NODE && (node as Text).data.trim() !== ''
      );
      const ownText = own
        .map(({ data }) => data)
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
      const rect = element.getBoundingClientRect();
      const clips =
        style.overflowX !== 'visible' || style.overflowY !== 'visible';
      const within = clips ? (clip ? intersect(clip, rect) : rect) : clip;
      const opacity = inherited.opacity * Number(style.opacity);
      const effects = [
        ...inherited.effects,
        ...EFFECTS.filter(
          ([property, none]) => style.getPropertyValue(property) !== none
        ).map(
          ([property]) =>
            `${nameOf(element)} ${property}: ${style.getPropertyValue(property)}`
        ),
      ];
      const fills = paints(element, style);
      if ((rect.width > 0 && rect.height > 0) || ownText) {
        if (fills || ownText) {
          let key = path;
          for (let occurrence = 2; key in elements; occurrence += 1) {
            key = `${path}#${occurrence}`;
          }
          const drawn: DrawnElement = { style: {} };
          // A transparent box is not drawn; only its text is.
          if (fills) {
            drawn.box = relative(rect, tileBox);
            if ((element.textContent ?? '').trim() !== '') {
              drawn.holdsText = true;
            }
            if (clip && empty(intersect(clip, rect))) {
              drawn.hidden = true;
            }
          }
          if (ownText) {
            const range = document.createRange();
            range.setStart(own[0]!, 0);
            range.setEnd(own.at(-1)!, own.at(-1)!.length);
            const drawnText = range.getBoundingClientRect();
            drawn.text = ownText;
            drawn.textRect = relative(drawnText, tileBox);
            if (within) {
              const visible = intersect(within, drawnText);
              drawn.visibleRect = relative(visible, tileBox);
              if (empty(visible)) {
                drawn.hidden = true;
              }
            }
            drawn.style.color = hex(style.color);
            drawn.style.fontFamily = style.fontFamily;
            drawn.style.fontSize = style.fontSize;
            drawn.style.fontWeight = style.fontWeight;
          }
          if (!transparent(style.backgroundColor)) {
            drawn.style.background = hex(style.backgroundColor);
          }
          if (bordered(style)) {
            drawn.style.borderColor = sides((side) =>
              hex(style.getPropertyValue(`border-${side}-color`))
            );
            drawn.style.border = sides(
              (side) =>
                `${style.getPropertyValue(`border-${side}-width`)} ${style.getPropertyValue(`border-${side}-style`)}`
            );
          }
          if (fills && style.borderRadius !== '0px') {
            drawn.style.borderRadius = style.borderRadius;
          }
          if (style.boxShadow !== 'none') {
            drawn.style.boxShadow = style.boxShadow;
          }
          if (element.tagName.toLowerCase() in SHAPES) {
            if (style.fill !== 'none') {
              drawn.style.fill = hex(style.fill);
            }
            if (style.fillRule !== 'nonzero') {
              drawn.style.fillRule = style.fillRule;
            }
            if (style.stroke !== 'none') {
              drawn.style.stroke = hex(style.stroke);
              drawn.style.strokeWidth = style.strokeWidth;
            }
            // The sparkline's area is recorded as the tile's `trend`.
            if (
              !element.closest('.echSingleMetricSparkline__svg') ||
              element.tagName !== 'path'
            ) {
              drawn.shape = geometry(element, style);
            }
          }
          if (opacity !== 1) {
            drawn.style.opacity = String(round(opacity, 3));
          }
          if (effects.length) {
            drawn.style.effects = effects.join('; ');
          }
          // An identity matrix draws as no transform at all.
          if (
            style.transform !== 'none' &&
            style.transform !== 'matrix(1, 0, 0, 1, 0, 0)'
          ) {
            drawn.style.transform = style.transform;
          }
          elements[key] = drawn;
        }
      }
      for (const child of element.children) {
        // A clickable title's button draws nothing of its own; `interactive` records it.
        const wrapper =
          child.tagName === 'BUTTON' && nameOf(child) === 'button';
        walk(child, wrapper ? path : `${path}>${nameOf(child)}`, {
          clip: within,
          opacity,
          effects,
        });
      }
    };
    walk(tile, nameOf(tile), { opacity: 1, effects: [] });
    return elements;
  };

  // An empty grid cell is an `.echMetric` too, but only a drawn tile is a figure.
  const drawnTiles = [
    ...container.querySelectorAll('.echMetric[role="figure"]'),
  ];
  const tiles = drawnTiles.map((tile): MetricTileFingerprint => {
    const id = tile.getAttribute('aria-labelledby') ?? '';
    const [, row = '0', column = '0'] = /-(\d+)-(\d+)$/.exec(id) ?? [];
    const fingerprint: MetricTileFingerprint = {
      position: [Number(row), Number(column)],
      box: relative(tile.getBoundingClientRect(), origin),
      interactive: Boolean(tile.querySelector('.echMetricText__title button')),
      value: text(tile.querySelector('.echMetricText__value')) ?? '',
      elements: readElements(tile),
    };
    const readings: ['title' | 'subtitle' | 'extra', string][] = [
      ['title', '.echMetricText__title'],
      ['subtitle', '.echMetricText__subtitle'],
      ['extra', '.echMetricText__extra'],
    ];
    for (const [key, selector] of readings) {
      const reading = text(tile.querySelector(selector));
      if (reading !== undefined) {
        fingerprint[key] = reading;
      }
    }
    const secondary = tile.querySelector('.echSecondaryMetric');
    if (secondary) {
      // The value is a badge when Lens colors it, and plain text otherwise.
      const shown = secondary.querySelector('.echSecondaryMetric__value');
      const label = text(secondary.querySelector('.echSecondaryMetric__label'));
      const value = text(
        shown?.querySelector('.echBadge__text') ?? shown ?? null
      );
      fingerprint.secondary = {
        ...(label === undefined ? {} : { label }),
        ...(value === undefined ? {} : { value }),
      };
    }
    const meter = tile.querySelector('[role="meter"]');
    if (meter) {
      fingerprint.progress = {
        now: Number(meter.getAttribute('aria-valuenow')),
        min: Number(meter.getAttribute('aria-valuemin')),
        max: Number(meter.getAttribute('aria-valuemax')),
      };
    }
    const path = tile.querySelector('.echSingleMetricSparkline__svg path');
    if (path) {
      fingerprint.trend = {
        paths: (path.getAttribute('d') ?? '')
          .split(/(?=M)/)
          .map((segment) =>
            (segment.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map((n) =>
              round(Number(n), 4)
            )
          )
          .filter((points) => points.length),
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
    empty: container.querySelectorAll(':scope > li').length - drawnTiles.length,
  };
};
