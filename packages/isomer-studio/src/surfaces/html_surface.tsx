/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';

const MIN_HEIGHT = 48;

const frameStyles = css`
  display: block;
  width: 100%;
  border: 0;
`;

const documentFor = (html: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;display:flow-root}</style></head><body>${html}</body></html>`;

/** Rendered markup in a sandboxed frame that runs no scripts, sized to its content. */
export const HtmlSurface = ({
  html,
  title,
}: {
  html: string;
  title: string;
}) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(MIN_HEIGHT);
  const [minWidth, setMinWidth] = useState<number>();

  useEffect(() => {
    const element = frame.current;
    if (!element) {
      return;
    }
    let observer: ResizeObserver | undefined;
    const measure = () => {
      const body = element.contentDocument?.body;
      if (!body) {
        return;
      }
      // A frame clips what overflows it, so a fixed-width document widens the frame to show it.
      const update = () => {
        setHeight(Math.max(MIN_HEIGHT, body.offsetHeight));
        const { scrollWidth } = body.ownerDocument.documentElement;
        const containerWidth = element.parentElement?.clientWidth ?? 0;
        setMinWidth(scrollWidth > containerWidth ? scrollWidth : undefined);
      };
      update();
      observer?.disconnect();
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(update);
        observer.observe(body);
      }
    };
    element.addEventListener('load', measure);
    return () => {
      element.removeEventListener('load', measure);
      observer?.disconnect();
    };
  }, []);

  return (
    <iframe
      ref={frame}
      title={title}
      sandbox="allow-same-origin"
      srcDoc={documentFor(html)}
      css={frameStyles}
      style={{ height, minWidth }}
    />
  );
};
