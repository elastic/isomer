/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, Fragment, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { SurfaceName } from '../composition/body_node_base';
import {
  definePrimitive,
  type PrimitiveNode,
  type RenderScope,
} from '../define/primitive_module';
import type { InkPackTypes } from '../testing/sdk.fixtures';

import { createPrimitiveDispatcher } from './primitive_dispatch';

interface SwatchNode extends PrimitiveNode {
  type: 'swatch';
}

interface GroupNode extends PrimitiveNode {
  type: 'group';
  items: PrimitiveNode[];
  deferred?: boolean;
}

const LIGHT = '#E3E8F2';
const DARK = '#2B394F';
const catalog = (type: string) => ({
  type,
  purpose: type,
  useWhen: [],
  avoidWhen: [],
  example: { type },
});
const swatch = definePrimitive<SwatchNode, InkPackTypes>({
  type: 'swatch',
  catalog: catalog('swatch'),
  examples: [],
  schema: z.object({ type: z.literal('swatch') }),
  renderers: {
    text: () => '',
    markdown: () => [],
    react: (_node, { theme }) =>
      createElement(
        'div',
        {
          style: {
            border: `1px solid ${theme?.ink ?? `light-dark(${LIGHT}, ${DARK})`}`,
          },
        },
        createElement(
          'svg',
          null,
          createElement('path', { fill: theme?.ink ?? LIGHT })
        )
      ),
  },
});
const group = definePrimitive<GroupNode, InkPackTypes>({
  type: 'group',
  catalog: catalog('group'),
  examples: [],
  schema: z.object({
    type: z.literal('group'),
    items: z.array(z.looseObject({ type: z.string() })),
    deferred: z.boolean().optional(),
  }),
  renderers: {
    text: () => '',
    markdown: () => [],
    react: ({ items, deferred }, { scope }) => {
      const Children = () =>
        createElement(
          'section',
          null,
          items.map((node, index) =>
            createElement(Fragment, { key: index }, scope.renderReact(node, {}))
          )
        );
      return deferred ? createElement(Children) : Children();
    },
  },
});
const dispatcher = () =>
  createPrimitiveDispatcher<SwatchNode | GroupNode, InkPackTypes>([
    group,
    swatch,
  ]);
const nested = (node: PrimitiveNode, deferred = false): GroupNode => {
  const inner: GroupNode = { type: 'group', items: [node], deferred };
  return { type: 'group', items: [inner], deferred };
};
const markup = (element: ReactNode) => renderToStaticMarkup(element);

describe('snapshot render scope', () => {
  it.each([false, true])(
    'inherits the palette through fresh contexts, deferred=%s',
    (deferred) => {
      const html = markup(
        dispatcher().renderSnapshot(
          nested({ type: 'swatch' }, deferred),
          {},
          { ink: DARK },
          'k'
        )
      );
      expect(html).toContain(`fill="${DARK}"`);
      expect(html).toContain(`border:1px solid ${DARK}`);
      expect(html).not.toContain('light-dark(');
    }
  );

  it.each([undefined, { ink: DARK }])(
    'preserves snapshot visibility with palette %s',
    (theme) => {
      const scope = dispatcher();
      for (const surfaces of [
        ['snapshot'],
        ['react'],
      ] satisfies SurfaceName[][]) {
        const node: SwatchNode = { type: 'swatch', surfaces };
        const html = markup(
          scope.renderSnapshot(nested(node, true), {}, theme, 'k')
        );
        expect(html.includes('<svg>')).toBe(surfaces[0] === 'snapshot');
      }
    }
  );

  it('keeps palettes isolated across deferred and bare React renders', () => {
    const scope = dispatcher();
    const node = nested({ type: 'swatch' }, true);
    const dark = scope.renderSnapshot(node, {}, { ink: DARK }, 'dark');
    const light = scope.renderSnapshot(node, {}, { ink: LIGHT }, 'light');
    const bare = scope.renderReact(node, {});
    expect(markup(light)).toContain(`fill="${LIGHT}"`);
    expect(markup(bare)).toContain('light-dark(');
    expect(markup(dark)).toContain(`fill="${DARK}"`);
    expect(markup(dark)).not.toContain('light-dark(');
  });

  it('allows an explicit renderOn to select another surface', () => {
    let captured: RenderScope<InkPackTypes> | undefined;
    const capture = definePrimitive<GroupNode, InkPackTypes>({
      ...group,
      renderers: {
        ...group.renderers,
        react: (_node, { scope }) => {
          captured = scope;
          return null;
        },
      },
    });
    const scope = createPrimitiveDispatcher<
      SwatchNode | GroupNode,
      InkPackTypes
    >([capture, swatch]);
    scope.renderSnapshot({ type: 'group', items: [] }, {}, { ink: DARK }, 'k');
    const node: SwatchNode = { type: 'swatch', surfaces: ['react'] };
    expect(captured?.renderReact(node, {})).toBeUndefined();
    expect(
      markup(captured?.renderOn('react', node, { context: {} }))
    ).toContain('light-dark(');
    expect(
      markup(
        captured?.renderOn(
          'snapshot',
          { type: 'swatch' },
          { context: {}, theme: { ink: LIGHT } }
        )
      )
    ).toContain(`fill="${LIGHT}"`);
  });
});
