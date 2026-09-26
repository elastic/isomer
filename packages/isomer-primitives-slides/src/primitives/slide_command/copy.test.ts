/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment happy-dom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';

import { COPY_BUTTON_ATTRIBUTE, copyScriptBody, SLIDE_COPY } from './copy';
import { highlightExample } from './examples';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (...nodes: unknown[]): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: nodes } as PrimitiveNode],
});

const composition = compose(highlightExample, {
  type: 'slideHeading',
  title: 'Copy',
});

const mount = ({ runScript = true } = {}) => {
  document.body.innerHTML = runtime.surfaces.html.render(composition, {
    enhancements: [SLIDE_COPY],
    scripts: 'host',
  }).html;
  const root = document.querySelector('.isomer')!;
  if (runScript) {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- runs the body the way a script-running host does.
    const run = new Function('root', copyScriptBody) as (root: Element) => void;
    run(root);
  }
  return root;
};

const copyButton = (root: ParentNode) =>
  root.querySelector<HTMLButtonElement>(`[${COPY_BUTTON_ATTRIBUTE}]`)!;

describe('slideCopy script', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('copies the whole command, highlight included, when its button is clicked', () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    mount().querySelector('button')!.click();
    expect(writeText).toHaveBeenCalledWith(highlightExample.command);
  });

  it('renders the button hidden, so it never shows without the script', () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } });
    expect(copyButton(mount({ runScript: false })).hidden).toBe(true);
  });

  it('reveals the button once it has wired it', () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } });
    expect(copyButton(mount()).hidden).toBe(false);
  });

  it('leaves the button hidden without a clipboard', () => {
    vi.stubGlobal('navigator', {});
    expect(copyButton(mount()).hidden).toBe(true);
  });

  it('ignores clicks anywhere else', () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    (mount().querySelector('code') as HTMLElement).click();
    expect(writeText).not.toHaveBeenCalled();
  });
});

describe('slideCopy in a live React render', () => {
  const renderLive = () => {
    const container = document.createElement('div');
    document.body.replaceChildren(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        runtime.surfaces.react.render(composition, {
          context: { enhancements: new Set([SLIDE_COPY]) },
        })
      );
    });
    return { container, unmount: () => act(() => root.unmount()) };
  };

  afterEach(() => vi.unstubAllGlobals());

  it('shows the button its own click handler wires', () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { container, unmount } = renderLive();
    const button = copyButton(container);
    expect(button.hidden).toBe(false);
    act(() => button.click());
    expect(writeText).toHaveBeenCalledWith(highlightExample.command);
    unmount();
  });

  it('keeps the button hidden without a clipboard', () => {
    vi.stubGlobal('navigator', {});
    const { container, unmount } = renderLive();
    expect(copyButton(container).hidden).toBe(true);
    unmount();
  });
});
