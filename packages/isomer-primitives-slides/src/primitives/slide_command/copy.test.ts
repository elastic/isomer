/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';
import { slideDistillery } from '../../theme/distillery';

import {
  COPY_BUTTON_ATTRIBUTE,
  copyScriptBody,
  SLIDE_COPY,
  slideCopyEnhancement,
} from './copy';
import { example, highlightExample } from './examples';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const composition: Composition = {
  type: 'view',
  body: [
    {
      type: 'slideFrame',
      body: [example, highlightExample],
    } as PrimitiveNode,
  ],
};

const runCopyScript = (root: Element) => {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- runs the body the way a script-running host does.
  const run = new Function('root', copyScriptBody) as (root: Element) => void;
  run(root);
};

const mount = ({ runScript = true } = {}) => {
  document.body.innerHTML = runtime.surfaces.html.render(composition, {
    enhancements: [SLIDE_COPY],
    scripts: 'host',
  }).html;
  const root = document.querySelector('.isomer')!;
  if (runScript) {
    runCopyScript(root);
  }
  return root;
};

const copyButtons = (root: ParentNode) => [
  ...root.querySelectorAll<HTMLButtonElement>(`[${COPY_BUTTON_ATTRIBUTE}]`),
];

describe('slideCopy script', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('copies the whole command, highlight included, when its button is clicked', () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    copyButtons(mount())[1]!.click();
    expect(writeText).toHaveBeenCalledWith(highlightExample.command);
  });

  it('adds a labelled, focusable button to each command, named for its command', () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } });
    const buttons = copyButtons(mount());
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button.type).toBe('button');
      expect(button.textContent).toBe(
        slideDistillery.tokens.command.copy.label.value
      );
      expect(button.tabIndex).toBe(0);
    }
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual(
      [example, highlightExample].map(
        ({ command }) =>
          `${slideDistillery.tokens.command.copy.label.value} ${command}`
      )
    );
  });

  it('adds no button until the script runs', () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } });
    expect(copyButtons(mount({ runScript: false }))).toHaveLength(0);
  });

  it('adds nothing without a clipboard', () => {
    vi.stubGlobal('navigator', {});
    expect(copyButtons(mount())).toHaveLength(0);
  });

  it('adds nothing twice when it runs again', () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } });
    const root = mount();
    runCopyScript(root);
    expect(copyButtons(root)).toHaveLength(2);
  });

  it('ignores clicks anywhere else', () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    mount().querySelector('code')!.click();
    expect(writeText).not.toHaveBeenCalled();
  });
});

describe('slideCopy on the react surface', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('adds the buttons once the wrapper section mounts', () => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } });
    const container = document.createElement('div');
    document.body.replaceChildren(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        runtime.surfaces.react.render(composition, {
          wrapper: true,
          enhancements: [slideCopyEnhancement],
        })
      );
    });
    expect(copyButtons(container)).toHaveLength(2);
    act(() => root.unmount());
  });
});
