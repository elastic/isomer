/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLayoutEffect, useRef, useState } from 'react';

import type { Theme } from '../surfaces';

import { useOverflow } from './overflow';

/** The html surface's output in a shadow root, per `runtime/docs/embedding.md`. */
export const ShadowHtml = ({
  css,
  html,
  theme,
  onOverflow,
}: {
  css: string;
  html: string;
  theme: Theme;
  /** Called with whether the slide's content runs past its frame body. */
  onOverflow?: ((overflowing: boolean) => void) | undefined;
}) => {
  const host = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ShadowRoot>();

  useLayoutEffect(() => {
    const element = host.current;
    if (!element) {
      return;
    }
    const root = element.shadowRoot ?? element.attachShadow({ mode: 'open' });
    root.innerHTML = '';
    const style = document.createElement('style');
    style.textContent = `:host { all: initial; display: block; color-scheme: ${theme}; }\n${css}`;
    const body = document.createElement('div');
    body.innerHTML = html;
    root.append(style, body);
    setRoot(root);
  }, [css, html, theme]);

  useOverflow(root, html, onOverflow);

  return <div ref={host} />;
};
