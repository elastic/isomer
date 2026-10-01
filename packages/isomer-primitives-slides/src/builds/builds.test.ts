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
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../pack';
import {
  showSlideBuild,
  SLIDE_BUILDS,
  slideBuilds,
  slideBuildsEnhancement,
} from '.';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const slide = (...body: object[]): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body } as PrimitiveNode],
});

const mount = (composition: Composition, enhancements = [SLIDE_BUILDS]) => {
  const { html } = runtime.surfaces.html.render(composition, { enhancements });
  document.body.innerHTML = html;
  return document.body;
};

const visibility = (root: ParentNode): string[] =>
  [...root.querySelectorAll('li')].map(
    (item) => (item as HTMLElement).style.visibility
  );

const two = { type: 'slideBulletList', items: ['One', 'Two'] };
const three = { type: 'slideBulletList', items: ['A', 'B', 'C'] };

describe('slide builds', () => {
  it('counts one click per building part, nested ones included', () => {
    expect(slideBuilds(slide(two, three))).toBe(5);
    expect(
      slideBuilds(
        slide({
          type: 'slideWindow',
          chrome: 'chat',
          title: 'Chat',
          body: [two],
        })
      )
    ).toBe(2);
    expect(slideBuilds(slide({ type: 'slideHeading', title: 'Only' }))).toBe(0);
  });

  it('renders anchors only when builds are requested and apply', () => {
    expect(runtime.surfaces.html.render(slide(two)).html).not.toContain(
      'data-isomer-node'
    );
    expect(
      runtime.surfaces.html.render(
        slide({ type: 'slideHeading', title: 'Only' }),
        { enhancements: [SLIDE_BUILDS] }
      ).html
    ).not.toContain('data-isomer-node');
    expect(
      runtime.surfaces.html.render(slide(two), { enhancements: [SLIDE_BUILDS] })
        .html
    ).toContain('data-isomer-node');
  });

  it('reveals parts in reading order across nodes, and hides them again', () => {
    const composition = slide(two, three);
    const root = mount(composition);
    showSlideBuild(root, composition, 0);
    expect(visibility(root)).toEqual(Array(5).fill('hidden'));
    showSlideBuild(root, composition, 3);
    expect(visibility(root)).toEqual(['', '', '', 'hidden', 'hidden']);
    showSlideBuild(root, composition, 1);
    expect(visibility(root)).toEqual([
      '',
      'hidden',
      'hidden',
      'hidden',
      'hidden',
    ]);
  });

  it('shows again what an earlier call hid, whatever composition is now drawn', () => {
    const composition = slide(two, three);
    const root = mount(composition);
    showSlideBuild(root, composition, 0);
    showSlideBuild(root, slide({ type: 'slideHeading', title: 'Next' }), 0);
    expect(visibility(root)).toEqual(Array(5).fill(''));
  });

  it('builds a slideList one row at a time, with or without terms', () => {
    const plain = {
      type: 'slideList',
      label: 'Facts',
      items: [{ body: 'One' }, { body: 'Two' }],
      footnote: 'Always.',
    };
    const termed = {
      type: 'slideList',
      items: [
        { term: 'A', body: 'One' },
        { body: 'Two' },
        { term: 'C', body: 'Three' },
      ],
    };
    expect(slideBuilds(slide(plain, termed))).toBe(5);
    const composition = slide(plain, termed);
    const root = mount(composition);
    showSlideBuild(root, composition, 3);
    expect(visibility(root)).toEqual(['', '', '', 'hidden', 'hidden']);
    expect(root.textContent).toContain('Facts');
    expect(root.textContent).toContain('Always.');
  });

  it('builds a slideTranscript one turn at a time', () => {
    const composition = slide({
      type: 'slideTranscript',
      label: 'Retry',
      turns: [
        { role: 'user', text: 'Chart revenue.' },
        { role: 'model', text: '{}', format: 'code' },
        { role: 'host', text: 'Rejected.' },
      ],
    });
    expect(slideBuilds(composition)).toBe(3);
    const root = mount(composition);
    showSlideBuild(root, composition, 1);
    expect(visibility(root)).toEqual(['', 'hidden', 'hidden']);
    expect(root.textContent).toContain('Retry');
  });

  it('builds each occurrence of a reused node object on its own', () => {
    const composition = slide(two, two);
    const root = mount(composition);
    showSlideBuild(root, composition, 3);
    expect(visibility(root)).toEqual(['', '', '', 'hidden']);
  });

  it('leaves a node whole when its parts cannot be found, keeping later offsets', () => {
    const composition = slide(two, three);
    const root = mount(composition);
    root.querySelector('ul')!.remove();
    showSlideBuild(root, composition, 3);
    expect(visibility(root)).toEqual(['', 'hidden', 'hidden']);
  });

  it('builds only the host slide in a React render, never an embedded one', () => {
    const composition = slide(two, {
      type: 'slideRender',
      surface: 'react',
      body: [three],
    });
    expect(slideBuilds(composition)).toBe(2);
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    document.body.replaceChildren(container);
    const root = createRoot(container);
    act(() =>
      root.render(
        runtime.surfaces.react.render(composition, {
          enhancements: [slideBuildsEnhancement],
        })
      )
    );
    showSlideBuild(container, composition, 0);
    expect(visibility(container)).toEqual(['hidden', 'hidden', '', '', '']);
    showSlideBuild(container, composition, 1);
    expect(visibility(container)).toEqual(['', 'hidden', '', '', '']);
    act(() => root.unmount());
  });
});
