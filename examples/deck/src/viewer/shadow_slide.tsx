/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  showSlideBuild,
  SLIDE_BUILDS,
} from '@elastic/isomer-primitives-slides';
import type { Composition } from '@elastic/isomer-sdk';

import { runtime } from '../runtime';

import { useOverflow } from './overflow';
import type { Theme } from './surfaces';

/**
 * One slide from the React surface, in a shadow root holding only the CSS that
 * render used, so no page stylesheet reaches in or out.
 */
export const ShadowSlide = ({
  build,
  composition,
  theme,
  onOverflow,
}: {
  /** How many of the slide's parts show; `undefined` draws it whole, with no builds. */
  build?: number | undefined;
  composition: Composition;
  theme: Theme;
  /** Called with whether the slide's content runs past its frame body. */
  onOverflow?: ((overflowing: boolean) => void) | undefined;
}) => {
  const host = useRef<HTMLDivElement>(null);
  const style = useRef<HTMLStyleElement>(null);
  const [root, setRoot] = useState<ShadowRoot>();

  useLayoutEffect(() => {
    const element = host.current;
    if (element) {
      setRoot(element.shadowRoot ?? element.attachShadow({ mode: 'open' }));
    }
  }, []);

  // The node closes over the collection it fills, so the two are built together.
  const building = build !== undefined;
  const { styles, node } = useMemo(() => {
    const collection = runtime.surfaces.html.createStyleCollection(
      composition,
      { heading: false, theme, enhancements: building ? [SLIDE_BUILDS] : [] }
    );
    return {
      styles: collection,
      node: runtime.surfaces.react.render(composition, {
        context: collection.context,
        heading: false,
        wrapper: { theme },
      }),
    };
  }, [composition, theme, building]);

  // Runs after the portal's first render, once `root` exists, and before paint.
  useLayoutEffect(() => {
    if (root && style.current) {
      style.current.textContent = `:host { all: initial; display: block; color-scheme: ${theme}; }\n${styles.css()}`;
    }
  }, [root, styles, theme]);

  useLayoutEffect(() => {
    if (root) {
      showSlideBuild(
        root,
        composition,
        build ?? Number.POSITIVE_INFINITY,
        runtime.primitives
      );
    }
  }, [root, node, composition, build]);

  useOverflow(root, styles, onOverflow);

  return (
    <div ref={host}>
      {root
        ? createPortal(
            <>
              <style ref={style} />
              {node}
            </>,
            root
          )
        : null}
    </div>
  );
};
