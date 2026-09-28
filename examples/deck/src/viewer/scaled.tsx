/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@elastic/isomer-primitives-slides';

const minScale = 0.1;

const contentBox = (element: HTMLElement) => {
  const { height, width } = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return {
    height: Math.max(
      0,
      height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
    ),
    width: Math.max(
      0,
      width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    ),
  };
};

/**
 * Fits the fixed slide canvas into the space it is given at its aspect ratio.
 * The box takes the scaled size, so layout never sees the full canvas, and a
 * slide only grows past its own size in fullscreen.
 */
export const Scaled = ({
  children,
  fullscreen,
}: {
  children: ReactNode;
  fullscreen: boolean;
}) => {
  const stage = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState({ height: 0, width: 0 });

  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) {
      return undefined;
    }
    const measure = () => {
      const next = contentBox(element);
      setAvailable((prev) =>
        prev.height === next.height && prev.width === next.width ? prev : next
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fit = Math.min(
    available.width / SLIDE_WIDTH,
    available.height / SLIDE_HEIGHT
  );
  const scale =
    available.width > 0 && available.height > 0
      ? Math.min(
          fullscreen ? Number.POSITIVE_INFINITY : 1,
          Math.max(minScale, fit)
        )
      : 0;

  return (
    <div className="scaled" ref={stage}>
      <div
        className="scaled-box"
        style={{ height: SLIDE_HEIGHT * scale, width: SLIDE_WIDTH * scale }}>
        <div
          className="scaled-canvas"
          style={{
            height: SLIDE_HEIGHT,
            transform: `scale(${scale})`,
            width: SLIDE_WIDTH,
          }}>
          {children}
        </div>
      </div>
    </div>
  );
};
