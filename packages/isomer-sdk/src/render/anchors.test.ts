/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createChildNodeWalker } from '../composition/body_node_base';
import type { Composition } from '../composition/composition';
import {
  definePrimitive,
  type PrimitiveNode,
} from '../define/primitive_module';
import type { EnhancementDefinition } from '../pack/enhancements';
import {
  primitiveConformanceCases,
  type PrimitiveConformanceHarness,
} from '../testing/conformance';

import {
  anchorValue,
  findNodeElements,
  NODE_ANCHOR_ATTRIBUTE,
  nodeAnchor,
  withAnchors,
  withoutAnchors,
} from './anchors';
import {
  type HTMLRenderOptions,
  renderHTMLWithDispatcher,
} from './html/envelope';
import { createPrimitiveDispatcher } from './primitive_dispatch';

interface LeafNode extends PrimitiveNode {
  type: 'leaf';
  text: string;
}

interface BoxNode extends PrimitiveNode {
  type: 'box';
  items: (LeafNode | BoxNode)[];
}

const catalog = <TNode extends PrimitiveNode>(
  type: string,
  example: TNode
) => ({
  type,
  purpose: type,
  useWhen: [],
  avoidWhen: [],
  example,
});

const leaf = definePrimitive<LeafNode>({
  type: 'leaf',
  catalog: catalog('leaf', { type: 'leaf', text: 'a' }),
  examples: [{ type: 'leaf', text: 'a' }],
  schema: z.object({ type: z.literal('leaf'), text: z.string() }),
  renderers: {
    react: (node, { context }) =>
      createElement('p', nodeAnchor(context, node), node.text),
    text: (node) => node.text,
    markdown: (node) => node.text,
  },
});

const box = definePrimitive<BoxNode>({
  type: 'box',
  catalog: catalog('box', { type: 'box', items: [] }),
  examples: [{ type: 'box', items: [] }],
  schema: z.object({ type: z.literal('box'), items: z.array(z.unknown()) }),
  children: (node) =>
    node.items.map((item, index) => ({ node: item, path: `items[${index}]` })),
  renderers: {
    react: (node, { context, scope }) =>
      createElement(
        'div',
        nodeAnchor(context, node),
        node.items.map((item) => scope.renderReact(item, context))
      ),
    text: () => 'box',
    markdown: () => 'box',
  },
});

const dispatcher = createPrimitiveDispatcher<LeafNode | BoxNode>([leaf, box]);
const walk = createChildNodeWalker([leaf, box]);
const valid = () => ({ valid: true, errors: [], warnings: [] });

const composition: Composition<LeafNode | BoxNode> = {
  type: 'view',
  title: 'Anchors',
  body: [
    { type: 'box', items: [{ type: 'leaf', text: 'one' }] },
    {
      type: 'box',
      items: [
        { type: 'box', items: [{ type: 'leaf', text: 'two' }] },
        { type: 'leaf', text: 'three' },
      ],
    },
  ],
};

const anchoredEnhancement: EnhancementDefinition = {
  id: 'leaves',
  appliesTo: () => true,
  anchors: true,
};
const plainEnhancement: EnhancementDefinition = {
  id: 'leaves',
  appliesTo: () => true,
};

const render = (
  options: HTMLRenderOptions = {},
  enhancementDefinitions: readonly EnhancementDefinition[] = []
) =>
  renderHTMLWithDispatcher(composition, {
    dispatcher,
    validate: valid,
    options,
    enhancementDefinitions,
  });

describe('nodeAnchor', () => {
  it('is empty unless the context asks for anchors', () => {
    expect(nodeAnchor(undefined, { type: 'leaf' })).toEqual({});
    expect(nodeAnchor({ anchors: false }, { type: 'leaf' })).toEqual({});
    expect(nodeAnchor({ anchors: true }, { type: 'leaf' })).toEqual({
      [NODE_ANCHOR_ATTRIBUTE]: 'leaf',
    });
  });
});

class InstanceContext {
  anchors?: boolean;

  readonly #label = 'instance';

  describe() {
    return this.#label;
  }
}

const describing = definePrimitive<LeafNode>({
  type: 'leaf',
  catalog: catalog('leaf', { type: 'leaf', text: 'a' }),
  examples: [{ type: 'leaf', text: 'a' }],
  schema: z.object({ type: z.literal('leaf'), text: z.string() }),
  renderers: {
    react: (node, { context }) =>
      createElement(
        'p',
        nodeAnchor(context, node),
        (context as InstanceContext).describe()
      ),
    text: (node) => node.text,
    markdown: (node) => node.text,
  },
});

describe('withAnchors', () => {
  it('decides for every nodeAnchor inside, whatever the context says', () => {
    const on = Object.freeze({ anchors: true });
    const off = Object.freeze({ anchors: false });
    expect(withAnchors(false, () => nodeAnchor(on, { type: 'leaf' }))).toEqual(
      {}
    );
    expect(withAnchors(true, () => nodeAnchor(off, { type: 'leaf' }))).toEqual({
      [NODE_ANCHOR_ATTRIBUTE]: 'leaf',
    });
    expect(nodeAnchor(on, { type: 'leaf' })).toEqual({
      [NODE_ANCHOR_ATTRIBUTE]: 'leaf',
    });
  });

  it('restores the outer decision after a nested render, and after a throw', () => {
    withAnchors(true, () => {
      withAnchors(false, () => undefined);
      expect(nodeAnchor({}, { type: 'leaf' })).not.toEqual({});
      expect(() =>
        withAnchors(false, () => {
          throw new Error('render failed');
        })
      ).toThrow('render failed');
      expect(nodeAnchor({}, { type: 'leaf' })).not.toEqual({});
    });
    expect(nodeAnchor({}, { type: 'leaf' })).toEqual({});
  });
});

describe('withoutAnchors', () => {
  it('turns anchors off for a context and any context spread from it', () => {
    const off = withoutAnchors({ anchors: true });
    const derived = { ...off, crowding: 2 };
    withAnchors(true, () => {
      expect(nodeAnchor(off, { type: 'leaf' })).toEqual({});
      expect(nodeAnchor(derived, { type: 'leaf' })).toEqual({});
    });
    expect(nodeAnchor(derived, { type: 'leaf' })).toEqual({});
  });

  it('returns a context that is not an object as it is', () => {
    expect(withoutAnchors(undefined)).toBeUndefined();
  });

  it('keeps methods, getters, private state, and instanceof working', () => {
    class PrivateContext {
      readonly #label = 'private';

      get label() {
        return this.#label;
      }

      describe() {
        return this.#label;
      }
    }
    for (const context of [
      new PrivateContext(),
      Object.freeze(new PrivateContext()),
    ]) {
      const off = withoutAnchors(context);
      expect(off).toBeInstanceOf(PrivateContext);
      expect(off.describe()).toBe('private');
      expect(off.label).toBe('private');
      expect(nodeAnchor({ ...off }, { type: 'leaf' })).toEqual({});
    }
  });

  it('marks a context once when applied twice or to a spread-derived context', () => {
    const twice = withoutAnchors(withoutAnchors({ anchors: true }));
    const again = withoutAnchors({ ...withoutAnchors({}) });
    withAnchors(true, () => {
      expect(nodeAnchor(twice, { type: 'leaf' })).toEqual({});
      expect(nodeAnchor(again, { type: 'leaf' })).toEqual({});
    });
    expect(Object.getOwnPropertySymbols({ ...again })).toHaveLength(1);
  });

  it('reads the mark without trusting a proxy that claims every key', () => {
    const claimsAll = new Proxy({}, { has: () => true });
    withAnchors(true, () =>
      expect(nodeAnchor(claimsAll, { type: 'leaf' })).not.toEqual({})
    );
  });

  it('beats an HTML render that asks for anchors, for a non-child a container draws', () => {
    interface HostNode extends PrimitiveNode {
      type: 'host';
      items: LeafNode[];
      extra: LeafNode;
    }
    const host = definePrimitive<HostNode>({
      type: 'host',
      catalog: catalog('host', {
        type: 'host',
        items: [],
        extra: { type: 'leaf', text: 'x' },
      }),
      examples: [
        { type: 'host', items: [], extra: { type: 'leaf', text: 'x' } },
      ],
      schema: z.object({
        type: z.literal('host'),
        items: z.array(z.unknown()),
        extra: z.unknown(),
      }),
      children: (node) =>
        node.items.map((item, index) => ({
          node: item,
          path: `items[${index}]`,
        })),
      renderers: {
        react: (node, { context, scope }) =>
          createElement(
            'div',
            nodeAnchor(context, node),
            ...node.items.map((item) => scope.renderReact(item, context)),
            scope.renderReact(node.extra, withoutAnchors(context))
          ),
        text: () => 'host',
        markdown: () => 'host',
      },
    });
    const { body } = renderHTMLWithDispatcher(
      {
        type: 'view',
        body: [
          {
            type: 'host',
            items: [{ type: 'leaf', text: 'child' }],
            extra: { type: 'leaf', text: 'extra' },
          },
        ],
      },
      {
        dispatcher: createPrimitiveDispatcher<LeafNode | HostNode>([
          leaf,
          host,
        ]),
        validate: valid,
        options: { anchors: true },
      }
    );
    expect(body.split(`${NODE_ANCHOR_ATTRIBUTE}="host"`)).toHaveLength(2);
    expect(body.split(`${NODE_ANCHOR_ATTRIBUTE}="leaf"`)).toHaveLength(2);
    expect(body).toContain('<p>extra</p>');
  });
});

describe('html anchors', () => {
  const renderFrozen = (
    context: { anchors: boolean },
    options: HTMLRenderOptions,
    enhancementDefinitions: readonly EnhancementDefinition[] = []
  ) =>
    renderHTMLWithDispatcher(composition, {
      dispatcher,
      validate: valid,
      options,
      enhancementDefinitions,
      styleAdapter: {
        createCollector: () => ({}),
        createRenderContext: () => Object.freeze({ ...context }),
        renderStyles: () => '',
      },
    }).body;

  it('renders none by default even when a frozen adapter context says anchors: true', () => {
    expect(renderFrozen({ anchors: true }, {})).not.toContain(
      NODE_ANCHOR_ATTRIBUTE
    );
  });

  it('renders them when an enhancement needs them even when a frozen adapter context says anchors: false', () => {
    const body = renderFrozen(
      { anchors: false },
      { enhancements: ['leaves'] },
      [anchoredEnhancement]
    );
    expect(body.split(`${NODE_ANCHOR_ATTRIBUTE}="leaf"`)).toHaveLength(4);
  });

  it('hands renderers the adapter context itself', () => {
    const built = new InstanceContext();
    const seen: unknown[] = [];
    const recording = definePrimitive<LeafNode>({
      ...leaf,
      renderers: {
        ...leaf.renderers,
        react: (node, { context }) => {
          seen.push(context);
          return createElement('p', nodeAnchor(context, node), node.text);
        },
      },
    });
    renderHTMLWithDispatcher(
      { type: 'view', body: [{ type: 'leaf', text: 'a' }] },
      {
        dispatcher: createPrimitiveDispatcher<LeafNode>([recording]),
        validate: valid,
        options: { anchors: true },
        styleAdapter: {
          createCollector: () => ({}),
          createRenderContext: () => built,
          renderStyles: () => '',
        },
      }
    );
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((context) => context === built)).toBe(true);
    expect(built.anchors).toBeUndefined();
  });

  it('keeps a class-instance adapter context working, anchors on or off', () => {
    const renderWith = (options: HTMLRenderOptions) =>
      renderHTMLWithDispatcher(
        { type: 'view', body: [{ type: 'leaf', text: 'a' }] },
        {
          dispatcher: createPrimitiveDispatcher<LeafNode>([describing]),
          validate: valid,
          options,
          styleAdapter: {
            createCollector: () => ({}),
            createRenderContext: () => new InstanceContext(),
            renderStyles: () => '',
          },
        }
      ).body;
    expect(renderWith({})).toContain('instance');
    expect(renderWith({ anchors: true })).toContain(
      `${NODE_ANCHOR_ATTRIBUTE}="leaf"`
    );
  });

  it('renders none unless asked, even when the adapter context says otherwise', () => {
    const renderWith = (options: HTMLRenderOptions) =>
      renderHTMLWithDispatcher(composition, {
        dispatcher,
        validate: valid,
        options,
        styleAdapter: {
          createCollector: () => ({}),
          createRenderContext: () => ({ anchors: true }),
          renderStyles: () => '',
        },
      }).body;
    expect(renderWith({})).not.toContain(NODE_ANCHOR_ATTRIBUTE);
    expect(renderWith({ anchors: false })).not.toContain(NODE_ANCHOR_ATTRIBUTE);
    expect(renderWith({ anchors: true })).toContain(NODE_ANCHOR_ATTRIBUTE);
  });

  it('renders none by default', () => {
    expect(render().body).not.toContain(NODE_ANCHOR_ATTRIBUTE);
  });

  it('renders one per node when asked', () => {
    const { body } = render({ anchors: true });
    expect(body.split(`${NODE_ANCHOR_ATTRIBUTE}="box"`)).toHaveLength(4);
    expect(body.split(`${NODE_ANCHOR_ATTRIBUTE}="leaf"`)).toHaveLength(4);
  });

  it('renders them when a resolved enhancement declares anchors, with no script', () => {
    const result = render({ enhancements: ['leaves'] }, [anchoredEnhancement]);
    expect(result.body).toContain(NODE_ANCHOR_ATTRIBUTE);
    expect(result.html).not.toContain('<script');
    expect(result.measurement.js).toBe(0);
  });

  it('renders none for an enhancement that is not requested or does not declare them', () => {
    expect(render({}, [anchoredEnhancement]).body).not.toContain(
      NODE_ANCHOR_ATTRIBUTE
    );
    expect(
      render({ enhancements: ['leaves'] }, [plainEnhancement]).body
    ).not.toContain(NODE_ANCHOR_ATTRIBUTE);
  });
});

/** Elements whose anchors carry `types`, as a parsed DOM returns them. */
const stubRoot = (types: readonly string[]) => {
  const elements = types.map((type) => ({
    getAttribute: () => anchorValue(type),
  }));
  return {
    elements,
    root: {
      querySelectorAll: (selector: string) => {
        if (selector !== `[${NODE_ANCHOR_ATTRIBUTE}]`) {
          throw new SyntaxError(`unsupported selector ${selector}`);
        }
        return elements;
      },
    } as unknown as ParentNode,
  };
};

describe('findNodeElements', () => {
  it('skips a node hidden from react, with its children', () => {
    const hidden = {
      type: 'box',
      surfaces: ['text'],
      items: [{ type: 'leaf', text: 'x' }],
    };
    const shown = { type: 'leaf', text: 'y' };
    const { root, elements } = stubRoot(['leaf']);
    const found = findNodeElements(root, [hidden, shown], walk);
    expect(found.get(shown)).toBe(elements[0]);
    expect(found.size).toBe(1);
  });

  it('pairs nested same-type nodes by pre-order and document order', () => {
    const { root, elements } = stubRoot([
      'box',
      'leaf',
      'box',
      'box',
      'leaf',
      'leaf',
    ]);
    const found = findNodeElements(root, composition.body, walk);
    const [first, second] = composition.body as BoxNode[];
    const inner = second!.items[0] as BoxNode;
    expect(found.get(first)).toBe(elements[0]);
    expect(found.get(second)).toBe(elements[2]);
    expect(found.get(inner)).toBe(elements[3]);
    expect(found.get(inner.items[0])).toBe(elements[4]);
    expect(found.get(second!.items[1])).toBe(elements[5]);
  });

  it('leaves out a type whose counts disagree', () => {
    const { root } = stubRoot(['box', 'leaf', 'box', 'box', 'leaf']);
    const found = findNodeElements(root, composition.body, walk);
    expect(found.size).toBe(3);
    expect(
      [...found.keys()].every((node) => (node as BoxNode).type === 'box')
    ).toBe(true);
  });
});

/** A valid type that is neither selector-safe nor HTML-safe. */
const oddType = `a"b&<c>'d\r\n\0e\uD800f`;

interface OddNode extends PrimitiveNode {
  text: string;
}

const odd = definePrimitive<OddNode>({
  type: oddType,
  catalog: catalog(oddType, { type: oddType, text: 'odd' }),
  examples: [{ type: oddType, text: 'odd' }],
  schema: z.object({ type: z.literal(oddType), text: z.string() }),
  renderers: {
    react: (node, { context }) =>
      createElement('p', nodeAnchor(context, node), node.text),
    text: (node) => node.text,
    markdown: (node) => node.text,
  },
});

describe('a type with selector and HTML syntax in it', () => {
  it('anchors with a value HTML parsing leaves unchanged', () => {
    const { [NODE_ANCHOR_ATTRIBUTE]: value } = nodeAnchor(
      { anchors: true },
      { type: oddType }
    );
    expect(value).toMatch(/^[\w%;-]+$/);
    expect(anchorValue('slideList')).toBe('slideList');
    expect(anchorValue('a;')).not.toBe(anchorValue('a%3b;'));
  });

  it('is found without being read as a selector', () => {
    const node = { type: oddType, text: 'odd' };
    const { root, elements } = stubRoot([oddType]);
    expect(
      findNodeElements(root, [node], createChildNodeWalker([odd])).get(node)
    ).toBe(elements[0]);
  });

  it('is counted after HTML escaping by the conformance case', () => {
    const anchorCase = primitiveConformanceCases.find(
      ({ name }) => name === 'renders a node anchor on every node when asked'
    )!;
    const oddDispatcher = createPrimitiveDispatcher<OddNode>([odd]);
    // The case reads only these members.
    const harness = {
      anchorWalk: createChildNodeWalker([odd]),
      wrapComposition: (node: PrimitiveNode) => ({
        type: 'view',
        body: [node],
      }),
      renderHTML: (wrapped: Composition) =>
        renderHTMLWithDispatcher(wrapped as Composition<OddNode>, {
          dispatcher: oddDispatcher,
          validate: valid,
          options: { anchors: true },
        }),
    } as unknown as PrimitiveConformanceHarness;
    expect(() =>
      anchorCase.run(
        {
          definition: odd,
          type: oddType,
          exampleIndex: 0,
          node: odd.examples[0]!,
        },
        harness
      )
    ).not.toThrow();
  });
});

describe('anchor conformance case', () => {
  const anchorCase = primitiveConformanceCases.find(
    ({ name }) => name === 'renders a node anchor on every node when asked'
  )!;
  const example = {
    definition: box,
    type: 'box',
    exampleIndex: 0,
    node: composition.body[1]!,
  };
  // The case reads only these members.
  const harness = (anchored: boolean, always = false) =>
    ({
      anchorWalk: walk,
      wrapComposition: (node: PrimitiveNode) => ({
        ...composition,
        body: [node],
      }),
      renderHTML: (wrapped: Composition, options?: { anchors?: boolean }) =>
        renderHTMLWithDispatcher(wrapped as Composition<LeafNode | BoxNode>, {
          dispatcher,
          validate: valid,
          options:
            always || (anchored && options?.anchors) ? { anchors: true } : {},
        }),
    }) as unknown as PrimitiveConformanceHarness;

  it('passes when every node renders its anchor', () => {
    expect(() => anchorCase.run(example, harness(true))).not.toThrow();
  });

  it('does not count attribute-shaped text that starts with whitespace', () => {
    const quietCase = primitiveConformanceCases.find(
      ({ name }) => name === 'renders no node anchors unless asked'
    )!;
    // The case reads only these members.
    const textOnly = {
      wrapComposition: (node: PrimitiveNode) => node,
      renderHTML: () => ({
        body: `<p> ${NODE_ANCHOR_ATTRIBUTE}="leaf" and a <code>${NODE_ANCHOR_ATTRIBUTE}="box"</code></p>`,
      }),
    } as unknown as PrimitiveConformanceHarness;
    expect(() => quietCase.run(example, textOnly)).not.toThrow();
  });

  it('does not count a mention of the attribute in rendered text', () => {
    const quietCase = primitiveConformanceCases.find(
      ({ name }) => name === 'renders no node anchors unless asked'
    )!;
    const mention = {
      ...example,
      node: { type: 'leaf', text: `${NODE_ANCHOR_ATTRIBUTE}="leaf"` },
    };
    expect(() => quietCase.run(mention, harness(false))).not.toThrow();
  });

  it('does not count an attribute whose name only ends in the anchor name', () => {
    // The case reads only these members.
    const lookalike = {
      anchorWalk: walk,
      wrapComposition: (node: PrimitiveNode) => ({
        ...composition,
        body: [node],
      }),
      renderHTML: () => ({
        body: `<p x-${NODE_ANCHOR_ATTRIBUTE}="leaf"></p>`,
      }),
    } as unknown as PrimitiveConformanceHarness;
    const leafExample = {
      definition: leaf,
      type: 'leaf',
      exampleIndex: 0,
      node: { type: 'leaf', text: 'a' },
    };
    expect(() => anchorCase.run(leafExample, lookalike)).toThrow(/anchor/);
  });

  it('fails for a container that draws its children out of walker order', () => {
    const reversed = definePrimitive<BoxNode>({
      ...box,
      renderers: {
        ...box.renderers,
        react: (node, { context, scope }) =>
          createElement(
            'div',
            nodeAnchor(context, node),
            [...node.items]
              .reverse()
              .map((item) => scope.renderReact(item, context))
          ),
      },
    });
    const reversedDispatcher = createPrimitiveDispatcher<LeafNode | BoxNode>([
      leaf,
      reversed,
    ]);
    const mixed = {
      type: 'box',
      items: [
        { type: 'leaf', text: 'first' },
        { type: 'box', items: [{ type: 'leaf', text: 'second' }] },
      ],
    } as BoxNode;
    // The case reads only these members.
    const outOfOrder = {
      anchorWalk: walk,
      wrapComposition: (node: PrimitiveNode) => ({
        ...composition,
        body: [node],
      }),
      renderHTML: (wrapped: Composition) =>
        renderHTMLWithDispatcher(wrapped as Composition<LeafNode | BoxNode>, {
          dispatcher: reversedDispatcher,
          validate: valid,
          options: { anchors: true },
        }),
    } as unknown as PrimitiveConformanceHarness;
    expect(() =>
      anchorCase.run({ ...example, node: mixed }, outOfOrder)
    ).toThrow(/walker order/);
  });

  it('fails the quiet case for a renderer that always anchors', () => {
    const quietCase = primitiveConformanceCases.find(
      ({ name }) => name === 'renders no node anchors unless asked'
    )!;
    expect(() => quietCase.run(example, harness(true, true))).toThrow();
  });

  it('fails when a node renders no anchor', () => {
    expect(() => anchorCase.run(example, harness(false))).toThrow(/anchor/);
  });
});
