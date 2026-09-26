/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AnchorHTMLAttributes,
  type MouseEvent,
  useEffect,
  useState,
} from 'react';

export type Page =
  | { name: 'home' }
  | { name: 'deck'; id: string }
  | { name: 'present'; id: string };

const deckPath = /^\/decks\/([\w-]+)(\/present)?\/?$/;

export const deckHref = (id: string): string => `/decks/${id}`;

export const presentHref = (id: string, search = ''): string =>
  `/decks/${id}/present${search}`;

const pageOf = (pathname: string): Page => {
  const match = deckPath.exec(pathname);
  if (!match) {
    return { name: 'home' };
  }
  const [, id, present] = match as unknown as [string, string, string?];
  return present ? { name: 'present', id } : { name: 'deck', id };
};

// `/?deck=<id>` was the studio's only page; its links now open the viewer.
const redirectLegacy = () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('deck');
  if (window.location.pathname !== '/' || !id) {
    return;
  }
  params.delete('deck');
  const search = params.size > 0 ? `?${params.toString()}` : '';
  window.history.replaceState(null, '', presentHref(id, search));
};

const listeners = new Set<() => void>();

export const navigate = (href: string) => {
  window.history.pushState(null, '', href);
  window.scrollTo(0, 0);
  listeners.forEach((listener) => listener());
};

/** The page the address bar names, kept current across `navigate` and history moves. */
export const usePage = (): Page => {
  const [page, setPage] = useState(() => {
    redirectLegacy();
    return pageOf(window.location.pathname);
  });
  useEffect(() => {
    const update = () => setPage(pageOf(window.location.pathname));
    listeners.add(update);
    window.addEventListener('popstate', update);
    return () => {
      listeners.delete(update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  return page;
};

const isPlainClick = (event: MouseEvent) =>
  event.button === 0 &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey &&
  !event.shiftKey;

/** An `<a>` that navigates in place on a plain click and still opens in a new tab. */
export const Link = ({
  href,
  onClick,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
  <a
    {...rest}
    href={href}
    onClick={(event) => {
      onClick?.(event);
      if (!event.defaultPrevented && isPlainClick(event)) {
        event.preventDefault();
        navigate(href);
      }
    }}
  />
);
