/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLayoutEffect, useRef, useState } from 'react';
import { showSlideBuild } from '@elastic/isomer-primitives-slides';
import { type Composition, runEnhancementScript } from '@elastic/isomer-sdk';

import { runtime } from '../runtime';

import { useOverflow } from './overflow';
import type { Theme } from './surfaces';

/** The html surface's output in a shadow root, per `runtime/docs/embedding.md`. */
export const ShadowHtml = ({
  build,
  composition,
  css,
  html,
  js,
  theme,
  onOverflow,
}: {
  /** How many of the slide's parts show; `undefined` draws it whole. */
  build?: number | undefined;
  /** What `html` was rendered from. */
  composition: Composition;
  css: string;
  html: string;
  /** The render's enhancement script, run against its section once inserted. */
  js: string;
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
    const section = body.querySelector('.isomer');
    if (section) {
      runEnhancementScript(js, section);
    }
    setRoot(root);
  }, [css, html, js, theme]);

  useLayoutEffect(() => {
    if (root) {
      showSlideBuild(
        root,
        composition,
        build ?? Number.POSITIVE_INFINITY,
        runtime.primitives
      );
    }
  }, [root, html, composition, build]);

  useOverflow(root, html, onOverflow);

  return <div ref={host} />;
};
