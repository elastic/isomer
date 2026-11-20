/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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

const firstRole = (element: Element) =>
  element.getAttribute('role')?.trim().split(/\s+/)[0] || undefined;

const headingLevel = (element: Element): number | undefined => {
  const role = firstRole(element);
  const native = /^h([1-6])$/.exec(element.localName)?.[1];
  if (role === undefined ? native === undefined : role !== 'heading') {
    return undefined;
  }
  const level = Number(element.getAttribute('aria-level'));
  return Number.isInteger(level) && level > 0 ? level : Number(native ?? 2);
};

/** A preview is content, not the page: nothing in it is a `main` landmark or a level-one heading. */
export const quietPreview = (root: ParentNode) => {
  root.querySelectorAll('main, h1, [role], [aria-level]').forEach((element) => {
    const role = firstRole(element);
    if (
      role === 'main' ||
      (role === undefined && element.localName === 'main')
    ) {
      element.setAttribute('role', 'generic');
    }
    if (headingLevel(element) === 1) {
      element.setAttribute('aria-level', '2');
    }
  });
};

/** Keeps {@link quietPreview} true as `root` changes, including attribute-only changes. */
export const observeQuietPreview = (root: ParentNode & Node) => {
  quietPreview(root);
  const observer = new MutationObserver(() => quietPreview(root));
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['role', 'aria-level'],
  });
  return () => observer.disconnect();
};

/** Renders `children` into an open shadow root, isolating them from the page's styles and navigation. */
export const ShadowRootHost = ({ children, title }: ShadowRootHostProps) => {
  const host = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ShadowRoot>();

  useLayoutEffect(() => {
    if (host.current) {
      setRoot(
        host.current.shadowRoot ?? host.current.attachShadow({ mode: 'open' })
      );
    }
  }, []);

  // Registered once the portal has mounted, so React's listener on the root runs first and its handlers can cancel navigation.
  useEffect(() => {
    if (!root) {
      return;
    }
    root.addEventListener('click', containLinks);
    root.addEventListener('submit', containSubmit);
    const stopQuieting = observeQuietPreview(root);
    return () => {
      root.removeEventListener('click', containLinks);
      root.removeEventListener('submit', containSubmit);
      stopQuieting();
    };
  }, [root]);

  return (
    <div ref={host} title={title}>
      {root ? createPortal(children(root), root) : null}
    </div>
  );
};
