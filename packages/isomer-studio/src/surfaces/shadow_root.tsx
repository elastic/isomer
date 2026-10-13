/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ShadowRootHostProps {
  children: (root: ShadowRoot) => ReactNode;
}

/** Renders `children` into an open shadow root, isolating them from the page's styles. */
export const ShadowRootHost = ({ children }: ShadowRootHostProps) => {
  const host = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ShadowRoot>();

  useLayoutEffect(() => {
    if (host.current) {
      setRoot(
        host.current.shadowRoot ?? host.current.attachShadow({ mode: 'open' })
      );
    }
  }, []);

  return (
    <div ref={host}>{root ? createPortal(children(root), root) : null}</div>
  );
};
