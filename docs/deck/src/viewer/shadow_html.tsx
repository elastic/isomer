/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLayoutEffect, useRef } from 'react';

import type { Theme } from '../surfaces';

/** The html surface's output in a shadow root, per `runtime/docs/embedding.md`. */
export const ShadowHtml = ({
  css,
  html,
  theme,
}: {
  css: string;
  html: string;
  theme: Theme;
}) => {
  const host = useRef<HTMLDivElement>(null);

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
  }, [css, html, theme]);

  return <div ref={host} />;
};
