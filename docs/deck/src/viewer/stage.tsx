/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { SLIDE_BUILDS } from '@elastic/isomer-primitives-slides';

import { runtime } from '../runtime';
import type { SurfaceId, Theme } from '../surfaces';

import { Scaled } from './scaled';
import { ShadowHtml } from './shadow_html';
import { ShadowSlide } from './shadow_slide';
import type { DeckSlide, PngUrl } from './types';

type Rendered =
  | { kind: 'slide' }
  | { kind: 'html'; html: string; css: string }
  | { kind: 'png'; src: string; alt: string }
  | { kind: 'source'; source: string };

// The viewer reports findings beside the stage, so a slide saved before a schema change still renders.
const lenient = { heading: false, onValidationError: 'collect' } as const;

const render = (
  slide: DeckSlide,
  surface: SurfaceId,
  theme: Theme,
  pngUrl: PngUrl,
  building: boolean
): Rendered => {
  const { composition } = slide;
  switch (surface) {
    case 'slide':
      return { kind: 'slide' };
    case 'html': {
      const { html, css } = runtime.surfaces.html.render(composition, {
        css: 'separate',
        heading: false,
        theme,
        enhancements: building ? [SLIDE_BUILDS] : [],
      });
      return { kind: 'html', html, css };
    }
    case 'png':
      return {
        kind: 'png',
        src: pngUrl(slide, theme),
        alt: runtime.surfaces.text.render(composition, lenient),
      };
    case 'markdown':
      return {
        kind: 'source',
        source: runtime.surfaces.markdown.render(composition, lenient),
      };
    case 'text':
      return {
        kind: 'source',
        source: runtime.surfaces.text.render(composition, lenient),
      };
    case 'slack':
      return {
        kind: 'source',
        source: JSON.stringify(
          runtime.surfaces.slack.render(composition, lenient).blocks,
          null,
          2
        ),
      };
  }
};

/** One slide on one surface. */
export const Stage = ({
  build,
  fullscreen,
  pngUrl,
  slide,
  surface,
  theme,
  onOverflow,
}: {
  /** How many of the slide's parts show, on the surfaces that build; `undefined` turns builds off. */
  build?: number | undefined;
  fullscreen: boolean;
  pngUrl: PngUrl;
  slide: DeckSlide;
  surface: SurfaceId;
  theme: Theme;
  /** Called with whether the slide overflows, on the surfaces the viewer lays out itself. */
  onOverflow?: ((overflowing: boolean) => void) | undefined;
}) => {
  const building = build !== undefined;
  const rendered = useMemo(
    () => render(slide, surface, theme, pngUrl, building),
    [slide, surface, theme, pngUrl, building]
  );

  switch (rendered.kind) {
    case 'slide':
      return (
        <Scaled {...{ fullscreen }}>
          <ShadowSlide
            composition={slide.composition}
            {...{ build, theme, onOverflow }}
          />
        </Scaled>
      );
    case 'html':
      return (
        <Scaled {...{ fullscreen }}>
          <ShadowHtml
            {...{ build, theme, onOverflow }}
            composition={slide.composition}
            css={rendered.css}
            html={rendered.html}
          />
        </Scaled>
      );
    case 'png':
      return (
        <Scaled {...{ fullscreen }}>
          <img
            alt={rendered.alt}
            className="png"
            height={1080}
            src={rendered.src}
            width={1920}
          />
        </Scaled>
      );
    case 'source':
      return (
        <pre className="source">
          <code>{rendered.source}</code>
        </pre>
      );
  }
};
