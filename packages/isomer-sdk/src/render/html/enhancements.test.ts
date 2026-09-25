/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  createChildNodeWalker,
  someBodyNode,
} from '../../composition/body_node_base';
import { runEnhancementScript } from '../../pack/enhancements';

import {
  type EnhancementDefinition,
  enhancementScript,
  rendersAnchors,
  resolveEnhancements,
} from './enhancements';

const sortableTable = {
  type: 'table',
  columns: [{ id: 'name', label: 'Name', sortable: true }],
  rows: [{ name: 'a' }],
};

const nestWalker = createChildNodeWalker([
  {
    type: 'nest',
    children: (node: unknown) => {
      const { items } = node as { items?: unknown[] };
      return (items ?? []).map((child, index) => ({
        node: child,
        path: `items[${index}]`,
      }));
    },
  },
]);

const tableSort: EnhancementDefinition = {
  id: 'tableSort',
  appliesTo: (body, walk) =>
    someBodyNode(
      body,
      'react',
      (node) =>
        Boolean(
          node &&
          typeof node === 'object' &&
          (node as { type?: string }).type === 'table' &&
          (node as { columns?: { sortable?: boolean }[] }).columns?.some(
            (column) => column.sortable
          )
        ),
      walk
    ),
  script: '/* tableSort */',
};

describe('resolveEnhancements', () => {
  it('finds a match nested in a container the walker knows and misses one it does not', () => {
    const body = [{ type: 'nest', items: [sortableTable] }];
    const requested = ['tableSort'];

    expect(
      resolveEnhancements(body, requested, nestWalker, [tableSort]).has(
        'tableSort'
      )
    ).toBe(true);

    expect(
      resolveEnhancements(body, requested, createChildNodeWalker([]), [
        tableSort,
      ]).has('tableSort')
    ).toBe(false);
  });

  it('ships no id when the host did not request it, even if content matches', () => {
    expect(
      resolveEnhancements([sortableTable], undefined, nestWalker, [tableSort])
        .size
    ).toBe(0);
  });

  it('ignores an id no pack declares and resolves each declared id once', () => {
    const resolved = resolveEnhancements(
      [sortableTable],
      ['unknown', 'tableSort', 'tableSort'],
      nestWalker,
      [tableSort]
    );
    expect([...resolved]).toEqual(['tableSort']);
  });
});

describe('enhancementScript', () => {
  it('emits requested scripts in definition order, each in its own scope', () => {
    const second: EnhancementDefinition = {
      id: 'clipboard',
      appliesTo: () => true,
      script: '/* clipboard */',
    };
    expect(
      enhancementScript(new Set(['clipboard', 'tableSort']), [
        tableSort,
        second,
      ])
    ).toBe(
      '(() => {\n/* tableSort */\n})();\n(() => {\n/* clipboard */\n})();'
    );
  });

  it('skips a resolved enhancement that has no script', () => {
    const hostDriven: EnhancementDefinition = {
      id: 'builds',
      appliesTo: () => true,
      anchors: true,
    };
    expect(
      enhancementScript(new Set(['builds', 'tableSort']), [
        hostDriven,
        tableSort,
      ])
    ).toBe('(() => {\n/* tableSort */\n})();');
  });

  it('runs both of two scripts that declare the same const, even after a return', () => {
    const flag = (id: string): EnhancementDefinition => ({
      id,
      appliesTo: () => true,
      script: `const seen = root.seen; seen.push('${id}'); return;`,
    });
    const root = { seen: [] as string[], querySelector: () => null };

    runEnhancementScript(
      enhancementScript(new Set(['first', 'second']), [
        flag('first'),
        flag('second'),
      ]),
      root as unknown as Element
    );

    expect(root.seen).toEqual(['first', 'second']);
  });
});

describe('rendersAnchors', () => {
  const anchored: EnhancementDefinition = {
    id: 'builds',
    appliesTo: () => true,
    anchors: true,
  };
  const inapplicable: EnhancementDefinition = {
    ...anchored,
    id: 'never',
    appliesTo: () => false,
  };
  const body = [sortableTable];

  it('is on when asked, or when a requested enhancement that applies declares anchors', () => {
    expect(rendersAnchors(body, { anchors: true }, nestWalker, [])).toBe(true);
    expect(
      rendersAnchors(body, { enhancements: ['builds'] }, nestWalker, [anchored])
    ).toBe(true);
  });

  it('is off otherwise, and `anchors: false` cannot turn off what an enhancement needs', () => {
    expect(rendersAnchors(body, {}, nestWalker, [anchored])).toBe(false);
    expect(
      rendersAnchors(body, { enhancements: ['never'] }, nestWalker, [
        inapplicable,
      ])
    ).toBe(false);
    expect(
      rendersAnchors(body, { enhancements: ['tableSort'] }, nestWalker, [
        tableSort,
      ])
    ).toBe(false);
    expect(
      rendersAnchors(
        body,
        { anchors: false, enhancements: ['builds'] },
        nestWalker,
        [anchored]
      )
    ).toBe(true);
  });
});
