/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { runEnhancementScript } from '@elastic/isomer-sdk/react';
import { css } from '@emotion/react';

import { ShadowRootHost } from './shadow_root';

const MIN_HEIGHT = 48;

const frameStyles = css`
  display: block;
  width: 100%;
  border: 0;
`;

const EDITABLE =
  'input, select, textarea, [contenteditable]:not([contenteditable="false"])';

/** Duck-typed: the framed document's elements belong to its own realm. */
const isEditable = (target: EventTarget | null): boolean =>
  typeof target === 'object' &&
  target !== null &&
  'closest' in target &&
  typeof target.closest === 'function' &&
  (target as Element).closest(EDITABLE) !== null;

/** Re-dispatches a key pressed inside the frame from the frame element, so the page's key handlers still see it; keys typed into the frame's own fields stay there. */
const forwardKey = (frame: HTMLIFrameElement) => (event: KeyboardEvent) => {
  const { key, code, location, repeat, shiftKey, altKey, ctrlKey, metaKey } =
    event;
  if (event.defaultPrevented || isEditable(event.target)) {
    return;
  }
  const forwarded = new KeyboardEvent(event.type, {
    ...{ key, code, location, repeat, shiftKey, altKey, ctrlKey, metaKey },
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  if (!frame.dispatchEvent(forwarded)) {
    event.preventDefault();
  }
};

const documentFor = (html: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;display:flow-root}</style></head><body>${html}</body></html>`;

/** Rendered markup in a sandboxed frame that runs no scripts, sized to its content. */
export const HtmlSurface = ({
  html,
  title,
}: {
  html: string;
  title: string;
}) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(MIN_HEIGHT);

  useEffect(() => {
    const element = frame.current;
    if (!element) {
      return;
    }
    let observer: ResizeObserver | undefined;
    let framed: Document | undefined;
    const onKey = forwardKey(element);
    const measure = () => {
      framed?.removeEventListener('keydown', onKey);
      framed = element.contentDocument ?? undefined;
      framed?.addEventListener('keydown', onKey);
      const body = framed?.body;
      if (!body) {
        return;
      }
      // A frame clips what overflows it, so a fixed-width document widens the frame to show it.
      // The width is set on the node so each measurement starts from the container's width.
      const update = () => {
        element.style.width = '';
        const { scrollWidth } = body.ownerDocument.documentElement;
        element.style.width =
          scrollWidth > element.clientWidth ? `${scrollWidth}px` : '';
        setHeight(Math.max(MIN_HEIGHT, body.offsetHeight));
      };
      update();
      observer?.disconnect();
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(update);
        observer.observe(body);
        // A frame widened past its container no longer resizes with it.
        if (element.parentElement) {
          observer.observe(element.parentElement);
        }
      }
    };
    element.addEventListener('load', measure);
    return () => {
      element.removeEventListener('load', measure);
      framed?.removeEventListener('keydown', onKey);
      observer?.disconnect();
    };
  }, []);

  return (
    <iframe
      ref={frame}
      title={title}
      sandbox="allow-same-origin"
      srcDoc={documentFor(html)}
      css={frameStyles}
      style={{ height }}
    />
  );
};

interface ShadowHtmlProps {
  html: string;
  title: string;
  enhancementScript?: string | undefined;
}

const ShadowHtmlContent = ({
  html,
  enhancementScript,
  onError,
}: ShadowHtmlProps & {
  onError: (error: string | undefined) => void;
}) => {
  const content = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = content.current;
    if (!element) {
      return;
    }
    element.innerHTML = html;
    onError(undefined);
    if (enhancementScript) {
      try {
        const root = element.querySelector('.isomer');
        if (!root) {
          throw new Error('The HTML output has no .isomer enhancement root.');
        }
        runEnhancementScript(enhancementScript, root);
      } catch (error) {
        onError(error instanceof Error ? error.message : String(error));
      }
    }
    return () => element.replaceChildren();
  }, [html, enhancementScript, onError]);
  return (
    <div
      ref={content}
      style={{ all: 'initial', display: 'flow-root', colorScheme: 'inherit' }}
    />
  );
};

/** HTML and its stylesheet in a shadow root; only host-provided enhancement scripts run. */
export const ShadowHtmlSurface = (props: ShadowHtmlProps) => {
  const [error, setError] = useState<string>();
  return (
    <>
      {error ? (
        <EuiCallOut
          size="s"
          color="danger"
          title="HTML enhancements failed"
          text={<p>{error}</p>}
        />
      ) : null}
      <ShadowRootHost title={props.title}>
        {() => <ShadowHtmlContent {...props} onError={setError} />}
      </ShadowRootHost>
    </>
  );
};
