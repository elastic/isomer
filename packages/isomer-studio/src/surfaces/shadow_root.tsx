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
  title?: string | undefined;
}

/** Opens a previewed link in a new tab so following it cannot unload Studio; in-page fragments do nothing. */
const containLinks = (event: Event) => {
  const { target, defaultPrevented } = event;
  const link =
    target instanceof Element ? target.closest('a[href], area[href]') : null;
  if (defaultPrevented || !link) {
    return;
  }
  event.preventDefault();
  const href = link.getAttribute('href') ?? '';
  if (!href.startsWith('#')) {
    window.open(
      new URL(href, document.baseURI).href,
      '_blank',
      'noopener,noreferrer'
    );
  }
};

const containSubmit = (event: Event) => event.preventDefault();

/** Renders `children` into an open shadow root, isolating them from the page's styles and navigation. */
export const ShadowRootHost = ({ children, title }: ShadowRootHostProps) => {
  const host = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ShadowRoot>();

  useLayoutEffect(() => {
    if (!host.current) {
      return;
    }
    const shadow =
      host.current.shadowRoot ?? host.current.attachShadow({ mode: 'open' });
    shadow.addEventListener('click', containLinks);
    shadow.addEventListener('submit', containSubmit);
    setRoot(shadow);
    return () => {
      shadow.removeEventListener('click', containLinks);
      shadow.removeEventListener('submit', containSubmit);
    };
  }, []);

  return (
    <div ref={host} title={title}>
      {root ? createPortal(children(root), root) : null}
    </div>
  );
};
