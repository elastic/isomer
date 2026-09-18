/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A render target a node can be shown on or hidden from. */
export type BodyNodeSurface = 'react' | 'svg' | 'text' | 'markdown' | 'slack';

/** Every {@link BodyNodeSurface}, for callers that iterate them. */
export const BODY_NODE_SURFACES: readonly BodyNodeSurface[] = [
  'react',
  'svg',
  'text',
  'markdown',
  'slack',
];

/** The two fields every primitive node carries, whatever its pack. */
export interface BodyNodeBase {
  /** Unique within a composition, which `validate` enforces and `parse` does not. */
  id?: string;
  /** Surfaces this node appears on. Absent means every surface. */
  surfaces?: BodyNodeSurface[];
}

/**
 * A child node together with the field path locating it inside its parent, so
 * an error path can name the field a child actually lives under. A container
 * that returned bare nodes would leave every caller guessing the field name.
 */
export interface ChildNodeRef {
  /** Erased: one walker spans every pack's node types, so it can name none of them. */
  node: unknown;
  /** Relative to the parent, e.g. `items[0].node`, `items[2].description`. */
  path: string;
}

/**
 * Walks nested nodes and, for a hybrid container, reports whether the parent
 * still produces output of its own. {@link rendersOnSurface} treats a
 * non-empty `children` result as the complete source of rendered content
 * unless {@link ChildNodeWalker.hasOwnContent} is true for that node.
 */
export type ChildNodeWalker = ((node: unknown) => ChildNodeRef[]) & {
  hasOwnContent?(node: unknown): boolean;
};

/**
 * Builds the {@link ChildNodeWalker} for one composition's inventory.
 *
 * Pass every pack's definitions: a walker missing one cannot see children of a
 * container that pack defines, and a tree walk would stop at its boundary.
 */
export const createChildNodeWalker = (
  definitions: readonly {
    type: string;
    children?: unknown;
    hasOwnContent?: unknown;
  }[]
): ChildNodeWalker => {
  const childrenByType = new Map<
    string,
    (node: unknown) => readonly ChildNodeRef[]
  >();
  const ownContentByType = new Map<string, (node: unknown) => boolean>();
  for (const definition of definitions) {
    if (typeof definition.children === 'function') {
      childrenByType.set(
        definition.type,
        definition.children as (node: unknown) => readonly ChildNodeRef[]
      );
    }
    if (typeof definition.hasOwnContent === 'function') {
      ownContentByType.set(
        definition.type,
        definition.hasOwnContent as (node: unknown) => boolean
      );
    }
  }
  const walk = ((node: unknown) => {
    if (!node || typeof node !== 'object') {
      return [];
    }
    const { type } = node as { type?: unknown };
    if (typeof type !== 'string') {
      return [];
    }
    return [...(childrenByType.get(type)?.(node) ?? [])];
  }) as ChildNodeWalker;
  walk.hasOwnContent = (node) => {
    if (!node || typeof node !== 'object') {
      return false;
    }
    const { type } = node as { type?: unknown };
    if (typeof type !== 'string') {
      return false;
    }
    return ownContentByType.get(type)?.(node) ?? false;
  };
  return walk;
};

/** Joins a parent path with a {@link ChildNodeRef.path} fragment. */
export const childNodePath = (parent: string, child: string): string =>
  `${parent}.${child}`;

/**
 * Whether any node visible on `surface` matches, descending through container
 * children via `walk`. A node (or a container ancestor) hidden from `surface`
 * is skipped along with its children.
 *
 * `walk` must span every pack in the composition: a walker built from one
 * pack's definitions cannot see children of a container defined in another.
 */
export const someBodyNode = (
  nodes: readonly unknown[],
  surface: BodyNodeSurface,
  predicate: (node: unknown) => boolean,
  walk: ChildNodeWalker
): boolean =>
  nodes.some((node) => {
    if (!isVisibleOnSurface(node, surface)) {
      return false;
    }
    return (
      predicate(node) ||
      someBodyNode(
        walk(node).map((child) => child.node),
        surface,
        predicate,
        walk
      )
    );
  });

/** Whether `node`'s own `surfaces` hint admits `surface`, ignoring its children. */
export const isVisibleOnSurface = (
  node: unknown,
  surface: BodyNodeSurface
): boolean => {
  if (!node || typeof node !== 'object') {
    return false;
  }
  const { surfaces } = node as { surfaces?: unknown };
  return !Array.isArray(surfaces) || surfaces.includes(surface);
};

/**
 * Whether `node` puts anything on `surface` — itself or through a descendant.
 *
 * Stronger than {@link isVisibleOnSurface}: a container every one of whose
 * children is hidden renders nothing, even though its own hint allows the
 * surface. A hybrid container that also owns string fields declares
 * {@link ChildNodeWalker.hasOwnContent} and keeps rendering regardless.
 */
export const rendersOnSurface = (
  node: unknown,
  surface: BodyNodeSurface,
  walk: ChildNodeWalker = () => []
): boolean => {
  if (!isVisibleOnSurface(node, surface)) {
    return false;
  }
  const children = walk(node);
  if (children.length === 0 || walk.hasOwnContent?.(node)) {
    return true;
  }
  return children.some(({ node: child }) =>
    rendersOnSurface(child, surface, walk)
  );
};
