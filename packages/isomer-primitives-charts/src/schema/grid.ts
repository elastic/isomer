/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type PrimitiveNode,
  requiredString,
  unresolvedBodyNodeSchema,
  z,
} from '@elastic/isomer-sdk/schema';

type ZodType<T = unknown> = z.ZodType<T>;

import { crossSuperRefine } from './cross_field';

/** Columns across a grid, as on a Kibana dashboard. */
export const GRID_COLUMNS = 48;

/**
 * Below this width in pixels a grid renders as one column in reading order, as
 * Kibana's dashboard does below EUI's `m` breakpoint.
 */
export const GRID_SINGLE_COLUMN_BELOW = 768;

/** The cross-field rules `gridSchema` states in its description, one sentence each. */
export const GRID_RULES = {
  width: `A panel's \`x + w\` is at most ${GRID_COLUMNS}.`,
  ids: 'Panel and section ids are unique within the grid.',
} as const;

const GRID_READING_ORDER =
  'Reading order is the top-level panels by `y`, then `x`, followed by each section by `y` with its panels by `y`, then `x`; ties keep array order.';

const panelShape = <TNode extends ZodType>(node: TNode) => ({
  id: z.string().min(1).optional(),
  title: z
    .string()
    .optional()
    .describe(
      'Shown in the panel header, apart from the node. Absent means no header.'
    ),
  description: z.string().optional(),
  x: z
    .int()
    .min(0)
    .max(GRID_COLUMNS - 1),
  y: z.int().min(0),
  w: z.int().min(1).max(GRID_COLUMNS),
  h: z.int().min(1),
  node,
});

const GRID_DESCRIPTION = [
  `Nodes placed on a ${GRID_COLUMNS}-column grid, with optional sections, as a Kibana dashboard lays out its panels. Positions and sizes are in grid units; a row unit's height is the renderer's. Below ${GRID_SINGLE_COLUMN_BELOW}px wide, and on text surfaces, panels follow reading order in one column.`,
  GRID_READING_ORDER,
  ...Object.values(GRID_RULES),
].join(' ');

interface GridPanelInput {
  id?: string | undefined;
  x: number;
  w: number;
}

interface GridInput {
  panels: GridPanelInput[];
  sections?:
    { id?: string | undefined; panels: GridPanelInput[] }[] | undefined;
}

const gridCheck = crossSuperRefine<GridInput>(
  ({ panels, sections }, context) => {
    const ids = new Set<string>();
    const claim = (id: string | undefined, path: (string | number)[]) => {
      if (id === undefined) {
        return;
      }
      if (ids.has(id)) {
        context.addIssue({
          code: 'custom',
          path,
          message: `${GRID_RULES.ids} "${id}" repeats.`,
        });
      }
      ids.add(id);
    };
    const checkPanels = (
      list: GridPanelInput[],
      prefix: (string | number)[]
    ) => {
      list.forEach(({ id, x, w }, index) => {
        claim(id, [...prefix, index, 'id']);
        if (x + w > GRID_COLUMNS) {
          context.addIssue({
            code: 'custom',
            path: [...prefix, index, 'w'],
            message: GRID_RULES.width,
          });
        }
      });
    };
    checkPanels(panels, ['panels']);
    (sections ?? []).forEach((section, index) => {
      claim(section.id, ['sections', index, 'id']);
      checkPanels(section.panels, ['sections', index, 'panels']);
    });
  },
  [GRID_RULES.width, GRID_RULES.ids]
);

const gridObject = <TNode extends ZodType>(node: TNode) => {
  const panel = z.strictObject(panelShape(node));
  return z
    .object({
      type: z.literal('grid'),
      title: z.string().optional(),
      description: z.string().optional(),
      panels: z.array(panel).describe('Panels outside any section.'),
      sections: z
        .array(
          z.strictObject({
            id: z.string().min(1).optional(),
            title: requiredString(),
            collapsed: z
              .boolean()
              .optional()
              .describe('A collapsed section shows its title alone.'),
            y: z.int().min(0),
            panels: z
              .array(panel)
              .describe("Panels with `y` relative to the section's top."),
          })
        )
        .optional(),
    })
    .describe(GRID_DESCRIPTION)
    .check(gridCheck);
};

/** The `grid` schema with its panel nodes unresolved, for standalone validation. */
export const gridSchema = gridObject(unresolvedBodyNodeSchema);

/** The `grid` schema bound to a composition's body-node union. */
export const gridSchemaFor = (bodyNode: ZodType<unknown>) =>
  gridObject(bodyNode);

/** A node placed on the grid, at `x`, `y` with size `w` by `h` in grid units. */
export interface GridPanel<TNode = PrimitiveNode> {
  id?: string;
  title?: string;
  description?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  node: TNode;
}

/** A titled group of panels, positioned by `y` and optionally collapsed. */
export interface GridSection<TNode = PrimitiveNode> {
  id?: string;
  title: string;
  collapsed?: boolean;
  y: number;
  panels: GridPanel<TNode>[];
}

/** A container's node type is hand-written: the body-node union is supplied per composition. */
export interface GridNode<TNode = PrimitiveNode> extends PrimitiveNode {
  type: 'grid';
  title?: string;
  description?: string;
  panels: GridPanel<TNode>[];
  sections?: GridSection<TNode>[];
}

/** A panel in reading order, with where it sits in the grid. */
export interface GridReadingEntry<TNode = PrimitiveNode> {
  panel: GridPanel<TNode>;
  /** The field path of the panel's node, such as `sections[0].panels[2].node`. */
  path: string;
  /** Absent for a top-level panel. */
  section?: GridSection<TNode>;
}

const byPosition = <TNode>(
  panels: readonly GridPanel<TNode>[]
): { panel: GridPanel<TNode>; index: number }[] =>
  panels
    .map((panel, index) => ({ panel, index }))
    .sort(
      (a, b) =>
        a.panel.y - b.panel.y || a.panel.x - b.panel.x || a.index - b.index
    );

/**
 * Every panel in reading order ({@link GRID_READING_ORDER}), with the path of
 * its node. Panels in a collapsed section are included; a renderer decides
 * whether to draw them.
 */
export const gridReadingOrder = <TNode>(
  node: Pick<GridNode<TNode>, 'panels' | 'sections'>
): GridReadingEntry<TNode>[] => [
  ...byPosition(node.panels).map(({ panel, index }) => ({
    panel,
    path: `panels[${index}].node`,
  })),
  ...(node.sections ?? [])
    .map((section, index) => ({ section, index }))
    .sort((a, b) => a.section.y - b.section.y || a.index - b.index)
    .flatMap(({ section, index: sectionIndex }) =>
      byPosition(section.panels).map(({ panel, index }) => ({
        panel,
        section,
        path: `sections[${sectionIndex}].panels[${index}].node`,
      }))
    ),
];
