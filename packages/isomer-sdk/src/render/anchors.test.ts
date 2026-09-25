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
  it('passes the same context when it already agrees', () => {
    const context = new InstanceContext();
    expect(withAnchors(context, false, (seen) => seen)).toBe(context);
  });

  it('sets it in place while rendering, then puts the old value back', () => {
    const context = new InstanceContext();
    const seen = withAnchors(context, true, (inside) => ({
      same: inside === context,
      anchors: inside.anchors,
      described: inside.describe(),
    }));
    expect(seen).toEqual({ same: true, anchors: true, described: 'instance' });
    expect(context.anchors).toBeUndefined();

    const bare: { anchors?: boolean } = {};
    withAnchors(bare, true, (inside) => expect(inside.anchors).toBe(true));
    expect(Object.hasOwn(bare, 'anchors')).toBe(false);

    const cached = { anchors: true };
    withAnchors(cached, false, (inside) => expect(inside.anchors).toBe(false));
    expect(cached.anchors).toBe(true);
  });

  it('puts the old value back when the render throws', () => {
    const context = { anchors: false };
    expect(() =>
      withAnchors(context, true, () => {
        throw new Error('render failed');
      })
    ).toThrow('render failed');
    expect(context.anchors).toBe(false);
  });

  it('restores a context whose `anchors` is an accessor', () => {
    class AccessorContext {
      #anchors = false;

      get anchors() {
        return this.#anchors;
      }

      set anchors(on: boolean) {
        this.#anchors = on;
      }
    }
    const context = new AccessorContext();
    withAnchors(context, true, (inside) => expect(inside.anchors).toBe(true));
    expect(context.anchors).toBe(false);
    expect(Object.hasOwn(context, 'anchors')).toBe(false);
  });

  it('renders a context that refuses the write as it is, private state intact', () => {
    const context = Object.freeze(
      Object.assign(new InstanceContext(), { anchors: true })
    );
    const seen = withAnchors(context, false, (inside) => ({
      same: inside === context,
      described: inside.describe(),
    }));
    expect(seen).toEqual({ same: true, described: 'instance' });
  });

  it('passes a context that is not an object as it is', () => {
    expect(withAnchors('plain', true, (seen) => seen)).toBe('plain');
    expect(withAnchors(undefined, true, (seen) => seen)).toBeUndefined();
  });
});

describe('html anchors', () => {
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
