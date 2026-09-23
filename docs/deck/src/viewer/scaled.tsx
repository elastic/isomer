/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@elastic/isomer-primitives-slides';

/** Fits a fixed 1920×1080 canvas into whatever box it is given. */
export const Scaled = ({ children }: { children: ReactNode }) => {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const element = box.current;
    if (!element) {
      return undefined;
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        const { width, height } = entry.contentRect;
        setScale(Math.min(width / SLIDE_WIDTH, height / SLIDE_HEIGHT));
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="scaled" ref={box}>
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
  );
};
