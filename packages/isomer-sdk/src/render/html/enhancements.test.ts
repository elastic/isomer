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

import {
  type EnhancementDefinition,
  enhancementScript,
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
  it('emits requested scripts in definition order', () => {
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
    ).toBe('/* tableSort */\n/* clipboard */');
  });
});
