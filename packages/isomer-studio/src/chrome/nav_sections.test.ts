/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navPacks, packLabel } from './nav_sections';

const labels: Record<string, string> = {
  callout: 'Callout',
  divider: 'Divider',
  health: 'Health',
  statGroup: 'Stat group',
  note: 'Note',
};

const labelOf = (type: string) => labels[type] ?? type;
const all = () => true;

describe('packLabel', () => {
  it('humanizes the last segment of an id', () => {
    expect(packLabel('slides')).toBe('Slides');
    expect(packLabel('elastic.slides')).toBe('Slides');
    expect(packLabel('@scope/stat-pack')).toBe('Stat pack');
  });
});

describe('navPacks', () => {
  const components = {
    id: 'components',
    groups: [
      { title: 'Narrative and content', types: ['callout', 'divider'] },
      { title: 'Data display', types: ['statGroup', 'health'] },
    ],
    types: ['callout', 'divider', 'health', 'statGroup'],
  };

  it('keeps one pack as its groups, sorted by label, keyed by the group title', () => {
    expect(navPacks([components], labelOf, all, false)).toEqual([
      {
        id: 'components',
        label: 'Components',
        groups: [
          {
            key: 'Narrative and content',
            title: 'Narrative and content',
            types: ['callout', 'divider'],
          },
          {
            key: 'Data display',
            title: 'Data display',
            types: ['health', 'statGroup'],
          },
        ],
      },
    ]);
  });

  it('puts ungrouped primitives last and drops a group the filter empties', () => {
    const withExtra = {
      ...components,
      types: [...components.types, 'note'],
    };
    const packs = navPacks(
      [withExtra],
      labelOf,
      (type) => type === 'note' || type === 'health',
      false
    );
    expect(packs[0]?.groups).toEqual([
      { key: 'Data display', title: 'Data display', types: ['health'] },
      { key: 'Other', title: 'Other', types: ['note'] },
    ]);
  });

  it('heads each pack and keys groups by pack when there is more than one', () => {
    const notes = {
      id: 'notes',
      groups: [{ title: 'Data display', types: ['note'] }],
      types: ['note'],
    };
    expect(navPacks([components, notes], labelOf, all, true)).toEqual([
      {
        id: 'components',
        label: 'Components',
        groups: [
          {
            key: 'components/Narrative and content',
            title: 'Narrative and content',
            types: ['callout', 'divider'],
          },
          {
            key: 'components/Data display',
            title: 'Data display',
            types: ['health', 'statGroup'],
          },
        ],
      },
      {
        id: 'notes',
        label: 'Notes',
        groups: [
          {
            key: 'notes/Data display',
            title: 'Data display',
            types: ['note'],
          },
        ],
      },
    ]);
  });
});
