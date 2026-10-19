/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { SurfaceName } from '../composition/body_node_base';
import {
  type DefaultPackTypes,
  definePrimitive,
  type PrimitiveNode,
  type RenderScope,
} from '../define/primitive_module';
import type { InkPackTypes } from '../testing/sdk.fixtures';

import {
  createPrimitiveDispatcher,
  type PrimitiveDispatcher,
} from './primitive_dispatch';

interface RequiredPackTypes extends InkPackTypes {
  context: InkPackTypes['context'] & { required: string };
}

interface LeafNode extends PrimitiveNode {
  type: 'leaf';
}

interface GroupNode extends PrimitiveNode {
  type: 'group';
  items: PrimitiveNode[];
  deferred?: boolean;
}

const assertContextArity = (
  required: PrimitiveDispatcher<PrimitiveNode, RequiredPackTypes>,
  requiredScope: RenderScope<RequiredPackTypes>,
  optional: PrimitiveDispatcher<PrimitiveNode, DefaultPackTypes>,
  optionalScope: RenderScope
): void => {
  const node = { type: 'leaf' };
  // @ts-expect-error the pack's context has a required field
  required.renderReact(node);
  // @ts-expect-error the pack's context has a required field
  requiredScope.renderReact(node);
  required.renderReact(node, { required: 'ok' });
  requiredScope.renderReact(node, { required: 'ok' });
  optional.renderReact(node);
  optionalScope.renderReact(node);
};

const DARK = '#2B394F';
const catalog = (type: string) => ({
  type,
  purpose: type,
  useWhen: [],
  avoidWhen: [],
  example: { type },
});
const leaf = definePrimitive<LeafNode, RequiredPackTypes>({
  type: 'leaf',
  catalog: catalog('leaf'),
  examples: [],
  schema: z.object({ type: z.literal('leaf') }),
  renderers: {
    text: () => '',
    markdown: () => [],
    react: (_node, { context, theme }) =>
      createElement(
        'span',
        { 'data-ink': theme?.ink ?? 'none' },
        context.required.toUpperCase()
      ),
  },
});
const group = definePrimitive<GroupNode, RequiredPackTypes>({
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
    react: ({ items, deferred }, { context: { required }, scope }) => {
      const Children = () =>
        createElement(
          'section',
          null,
          items.map((node, index) =>
            createElement(
              Fragment,
              { key: index },
              scope.renderReact(node, { required })
            )
          )
        );
      return deferred ? createElement(Children) : Children();
    },
  },
});
const dispatcher = createPrimitiveDispatcher<
  LeafNode | GroupNode,
  RequiredPackTypes
>([group, leaf]);
const nested = (node: PrimitiveNode, deferred: boolean): GroupNode => {
  const inner: GroupNode = { type: 'group', items: [node], deferred };
  return { type: 'group', items: [inner], deferred };
};
const context = { required: 'ok' };

describe('RenderScope.renderReact context', () => {
  it('rejects an omitted context only when the pack requires one', () => {
    expect(assertContextArity).toEqual(expect.any(Function));
  });

  it.each([false, true])(
    'passes a required context to nested react children, deferred=%s',
    (deferred) => {
      const html = renderToStaticMarkup(
        dispatcher.renderReact(nested({ type: 'leaf' }, deferred), context)
      );
      expect(html).toContain('<span data-ink="none">OK</span>');
    }
  );

  it.each([false, true])(
    'passes a required context and the palette to nested snapshot children, deferred=%s',
    (deferred) => {
      const html = renderToStaticMarkup(
        dispatcher.renderSnapshot(
          nested({ type: 'leaf' }, deferred),
          context,
          { ink: DARK },
          'k'
        )
      );
      expect(html).toContain(`<span data-ink="${DARK}">OK</span>`);
    }
  );

  it.each([
    [['snapshot'], true],
    [['react'], false],
  ] satisfies [SurfaceName[], boolean][])(
    'keeps snapshot visibility for a leaf on %j',
    (surfaces, visible) => {
      const html = renderToStaticMarkup(
        dispatcher.renderSnapshot(
          nested({ type: 'leaf', surfaces }, true),
          context,
          { ink: DARK },
          'k'
        )
      );
      expect(html.includes('OK')).toBe(visible);
    }
  );
});
