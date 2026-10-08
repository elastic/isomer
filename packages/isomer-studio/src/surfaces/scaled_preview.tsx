/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';

/** `fit` scales content down to its container, never up; a number is a fixed scale. */
export type PreviewZoom = 'fit' | number;

export interface ScaledPreviewProps {
  zoom?: PreviewZoom;
  /** With `fit`, also scales content down to this height. */
  maxHeight?: number | undefined;
  children: ReactNode;
}

interface Size {
  width: number;
  height: number;
}

const sameSize = (a: Size, b: Size) =>
  a.width === b.width && a.height === b.height;

const scaleFor = (
  zoom: PreviewZoom,
  available: number,
  content: Size,
  maxHeight: number | undefined
): number =>
  zoom === 'fit'
    ? Math.min(
        1,
        available / content.width,
        maxHeight && content.height ? maxHeight / content.height : 1
      )
    : zoom;

/**
 * Lays `children` out at the width the zoom implies and scales them to it.
 *
 * Fluid content fills the container at every zoom; content with a fixed
 * width, such as a 1920px slide, keeps it and is scaled as a whole.
 */
export const ScaledPreview = ({
  zoom = 'fit',
  maxHeight,
  children,
}: ScaledPreviewProps) => {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);
  const [content, setContent] = useState<Size>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const outerElement = outer.current;
    const innerElement = inner.current;
    if (!outerElement || !innerElement) {
      return;
    }
    const measure = () => {
      setAvailable(outerElement.clientWidth);
      const next = {
        width: innerElement.scrollWidth,
        height: innerElement.scrollHeight,
      };
      setContent((current) => (sameSize(current, next) ? current : next));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(outerElement);
    observer.observe(innerElement);
    return () => observer.disconnect();
  }, []);

  const isMeasured = available > 0 && content.width > 0;
  const layoutWidth = zoom === 'fit' ? available : available / zoom;
  const scale = isMeasured ? scaleFor(zoom, available, content, maxHeight) : 1;
  const width = Math.max(content.width, layoutWidth);

  return (
    <div
      ref={outer}
      css={css`
        overflow-x: auto;
      `}>
      <div
        css={
          isMeasured
            ? css`
                position: relative;
                overflow: hidden;
                margin-inline: auto;
                width: ${width * scale}px;
                height: ${content.height * scale}px;
              `
            : undefined
        }>
        <div
          ref={inner}
          css={
            isMeasured
              ? css`
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: ${layoutWidth}px;
                  transform: scale(${scale});
                  transform-origin: 0 0;
                `
              : undefined
          }>
          {children}
        </div>
      </div>
    </div>
  );
};
