/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ReactNode, useMemo } from 'react';

import type { DeckSlide } from '../deck';
import { runtime } from '../runtime';
import { pngPath, type SurfaceId, type Theme } from '../surfaces';

import { Scaled } from './scaled';
import { ShadowHtml } from './shadow_html';

type Rendered =
  | { kind: 'canvas'; node: ReactNode }
  | { kind: 'html'; html: string; css: string }
  | { kind: 'png'; src: string; alt: string }
  | { kind: 'source'; source: string };

const render = (
  { composition, slug }: DeckSlide,
  surface: SurfaceId,
  theme: Theme
): Rendered => {
  switch (surface) {
    case 'slide':
      return {
        kind: 'canvas',
        node: runtime.surfaces.react.render(composition, { heading: false }),
      };
    case 'html': {
      const { html, css } = runtime.surfaces.html.render(composition, {
        css: 'separate',
        heading: false,
        theme,
      });
      return { kind: 'html', html, css };
    }
    case 'png':
      return {
        kind: 'png',
        src: `${import.meta.env.BASE_URL}${pngPath(slug, theme)}`,
        alt: runtime.surfaces.text.render(composition),
      };
    case 'markdown':
      return {
        kind: 'source',
        source: runtime.surfaces.markdown.render(composition),
      };
    case 'text':
      return {
        kind: 'source',
        source: runtime.surfaces.text.render(composition),
      };
    case 'slack':
      return {
        kind: 'source',
        source: JSON.stringify(
          runtime.surfaces.slack.render(composition).blocks,
          null,
          2
        ),
      };
    case 'json':
      return { kind: 'source', source: JSON.stringify(composition, null, 2) };
  }
};

/** One slide on one surface. */
export const Stage = ({
  slide,
  surface,
  theme,
}: {
  slide: DeckSlide;
  surface: SurfaceId;
  theme: Theme;
}) => {
  const rendered = useMemo(
    () => render(slide, surface, theme),
    [slide, surface, theme]
  );

  switch (rendered.kind) {
    case 'canvas':
      return (
        <Scaled>
          <div style={{ colorScheme: theme }}>{rendered.node}</div>
        </Scaled>
      );
    case 'html':
      return (
        <Scaled>
          <ShadowHtml {...{ theme }} css={rendered.css} html={rendered.html} />
        </Scaled>
      );
    case 'png':
      return (
        <Scaled>
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
