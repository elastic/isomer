/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

import { act, createElement, type ReactNode, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  type Composition,
  createChildNodeWalker,
  definePrimitive,
  definePrimitivePack,
  type EnhancementDefinition,
  NODE_ANCHOR_ATTRIBUTE,
  nodeAnchor,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { findNodeElementPairs } from '@elastic/isomer-sdk/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createIsomerRuntime } from '../assemble';

interface StepNode extends PrimitiveNode {
  type: 'step';
  text: string;
}

const stepPrimitive = definePrimitive<StepNode>({
  type: 'step',
  catalog: {
    type: 'step',
    purpose: 'One step.',
    useWhen: ['A test needs an anchored node.'],
    avoidWhen: ['Always, outside tests.'],
    example: { type: 'step', text: 'One' },
  },
  examples: [{ type: 'step', text: 'One' }],
  schema: z.object({ type: z.literal('step'), text: z.string() }),
  renderers: {
    react: (node, { context }) => {
      const { enhancements } = context as { enhancements?: Set<string> };
      return createElement(
        'p',
        {
          ...nodeAnchor(context, node),
          'data-enhancements': [...(enhancements ?? [])].join(' '),
        },
        node.text
      );
    },
    text: (node) => node.text,
    markdown: (node) => node.text,
  },
});

/** Counts its runs on the root and records how many anchors it found. */
const counted: EnhancementDefinition = {
  id: 'counted',
  appliesTo: (body) => body.some(({ type }) => type === 'step'),
  anchors: true,
  script: [
    'root.dataset.runs = String(Number(root.dataset.runs ?? 0) + 1);',
    `root.dataset.anchors = String(root.querySelectorAll('[${NODE_ANCHOR_ATTRIBUTE}]').length);`,
  ].join('\n'),
};

const runtime = createIsomerRuntime({
  packs: [
    definePrimitivePack({
      id: 'test',
      surfaces: [],
      primitives: [stepPrimitive],
      enhancements: [counted],
    }),
  ],
});

const step: StepNode = { type: 'step', text: 'twice' };
const composition: Composition = { type: 'view', body: [step, step] };

let container: HTMLElement;
let root: Root | undefined;

const mount = (node: ReactNode): HTMLElement => {
  container = document.createElement('div');
  document.body.append(container);
  act(() => {
    root = createRoot(container);
    root.render(node);
  });
  return container;
};

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  container.remove();
  vi.restoreAllMocks();
});

describe('react surface enhancements', () => {
  it('runs an applied script against the wrapper section, with anchors on', () => {
    const section = mount(
      runtime.surfaces.react.render(composition, {
        wrapper: true,
        enhancements: ['counted'],
      })
    ).querySelector('section')!;
    expect(section.dataset.runs).toBe('1');
    expect(section.dataset.anchors).toBe('2');
    expect(section.querySelector('p')!.getAttribute('data-enhancements')).toBe(
      'counted'
    );
  });

  it('pairs a node object used twice with each of its elements', () => {
    const section = mount(
      runtime.surfaces.react.render(composition, {
        wrapper: true,
        enhancements: ['counted'],
      })
    ).querySelector('section')!;
    const pairs = findNodeElementPairs(
      section,
      composition.body,
      createChildNodeWalker(runtime.primitives)
    );
    expect(pairs.map(({ node }) => node)).toEqual([step, step]);
    expect(pairs.map(({ element }) => element)).toEqual([
      ...section.querySelectorAll('p'),
    ]);
  });

  it('runs once per composition under StrictMode and across re-renders', () => {
    const render = (target: Composition) =>
      createElement(
        StrictMode,
        null,
        runtime.surfaces.react.render(target, {
          wrapper: true,
          enhancements: ['counted'],
        })
      );
    const section = mount(render(composition)).querySelector('section')!;
    expect(section.dataset.runs).toBe('1');
    act(() => root!.render(render(composition)));
    expect(section.dataset.runs).toBe('1');
    act(() => root!.render(render({ ...composition })));
    const fresh = container.querySelector('section')!;
    expect(fresh).not.toBe(section);
    expect(fresh.dataset.runs).toBe('1');
  });

  it('runs once for a node rendered again', () => {
    const render = () =>
      runtime.surfaces.react.renderNode(step, {
        wrapper: true,
        enhancements: ['counted'],
      });
    const section = mount(render()).querySelector('section')!;
    act(() => root!.render(render()));
    expect(section.dataset.runs).toBe('1');
  });

  it('keeps sibling renders of one composition apart', () => {
    const error = vi.spyOn(console, 'error');
    const render = (target: Composition) =>
      runtime.surfaces.react.render(target, {
        wrapper: true,
        enhancements: ['counted'],
      });
    const [first, second] = mount(
      createElement('div', null, render(composition), render(composition))
    ).querySelectorAll('section');
    act(() =>
      root!.render(
        createElement(
          'div',
          null,
          render(composition),
          render({ ...composition })
        )
      )
    );
    const [kept, fresh] = container.querySelectorAll('section');
    expect(error).not.toHaveBeenCalled();
    expect(kept).toBe(first);
    expect(kept!.dataset.runs).toBe('1');
    expect(fresh).not.toBe(second);
    expect(fresh!.dataset.runs).toBe('1');
  });

  it('leaves out an enhancement with nothing to act on', () => {
    const section = mount(
      runtime.surfaces.react.render(
        { type: 'view', body: [] },
        { wrapper: true, enhancements: ['counted'] }
      )
    ).querySelector('section')!;
    expect(section.dataset.runs).toBeUndefined();
  });

  it('renders no anchors and no enhancements without the option', () => {
    const section = mount(
      runtime.surfaces.react.render(composition, { wrapper: true })
    ).querySelector('section')!;
    expect(section.querySelector(`[${NODE_ANCHOR_ATTRIBUTE}]`)).toBeNull();
    expect(section.dataset.runs).toBeUndefined();
  });

  it('ignores an id no pack registers', () => {
    const section = mount(
      runtime.surfaces.react.render(composition, {
        wrapper: true,
        enhancements: ['absent'],
      })
    ).querySelector('section')!;
    expect(section.dataset.runs).toBeUndefined();
    expect(section.querySelector(`[${NODE_ANCHOR_ATTRIBUTE}]`)).toBeNull();
  });

  it('warns once per composition and runs nothing without a wrapper', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const target: Composition = { ...composition };
    const render = () =>
      runtime.surfaces.react.render(target, { enhancements: ['counted'] });
    const host = mount(render());
    act(() => root!.render(render()));
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('`wrapper`'));
    expect(host.dataset.runs).toBeUndefined();
    expect(host.querySelectorAll(`[${NODE_ANCHOR_ATTRIBUTE}]`)).toHaveLength(2);
  });
});
