/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { humanize } from '../model/describe_runtime';

const UNGROUPED = 'Other';

export interface NavPackInput {
  id: string;
  groups: readonly { title: string; types: readonly string[] }[];
  types: readonly string[];
}

export interface NavPackGroup {
  /** Stable across the packs a runtime loads, so a remembered closed group stays that group's. */
  key: string;
  title: string;
  types: string[];
}

export interface NavPack {
  id: string;
  label: string;
  groups: NavPackGroup[];
}

/** The last segment of a pack id, as a heading: `slides` and `elastic.slides` are both `Slides`. */
export const packLabel = (id: string): string => {
  const segment = id.split(/[/.:]/).filter((part) => part.length > 0);
  return humanize(segment[segment.length - 1] ?? id);
};

/**
 * One entry per pack that still has a primitive after `matches`, groups in pack order.
 *
 * With one pack, a group's `key` is its title. With more, it includes the pack id,
 * so two packs can each have a group of the same name.
 */
export const navPacks = (
  packs: readonly NavPackInput[],
  labelOf: (type: string) => string,
  matches: (type: string) => boolean,
  separatePacks: boolean
): NavPack[] => {
  const byLabel = (types: readonly string[]): string[] =>
    [...types]
      .filter(matches)
      .sort((a, b) => labelOf(a).localeCompare(labelOf(b)));

  return packs.flatMap((pack): NavPack[] => {
    const owned = new Set(pack.types);
    const grouped = new Set<string>();
    const groups = pack.groups.flatMap((group): NavPackGroup[] => {
      const types = byLabel(group.types.filter((type) => owned.has(type)));
      types.forEach((type) => grouped.add(type));
      return types.length
        ? [
            {
              key: separatePacks ? `${pack.id}/${group.title}` : group.title,
              title: group.title,
              types,
            },
          ]
        : [];
    });
    const ungrouped = byLabel(pack.types.filter((type) => !grouped.has(type)));
    if (ungrouped.length) {
      groups.push({
        key: separatePacks ? `${pack.id}/${UNGROUPED}` : UNGROUPED,
        title: UNGROUPED,
        types: ungrouped,
      });
    }
    return groups.length
      ? [{ id: pack.id, label: packLabel(pack.id), groups }]
      : [];
  });
};
