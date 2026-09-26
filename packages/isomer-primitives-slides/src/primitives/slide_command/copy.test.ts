/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment happy-dom

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';

import { copyScriptBody, SLIDE_COPY } from './copy';
import { highlightExample } from './examples';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (...nodes: unknown[]): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: nodes } as PrimitiveNode],
});

const mount = () => {
  document.body.innerHTML = runtime.surfaces.html.render(
    compose(highlightExample, { type: 'slideHeading', title: 'Copy' }),
    { enhancements: [SLIDE_COPY] }
  ).html;
  const root = document.querySelector('.isomer')!;
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- runs the body the way a script-running host does.
  const run = new Function('root', copyScriptBody) as (root: Element) => void;
  run(root);
  return root;
};

describe('slideCopy script', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('copies the whole command, highlight included, when its button is clicked', () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    mount().querySelector('button')!.click();
    expect(writeText).toHaveBeenCalledWith(highlightExample.command);
  });

  it('ignores clicks anywhere else', () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    (mount().querySelector('code') as HTMLElement).click();
    expect(writeText).not.toHaveBeenCalled();
  });
});
