/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  CHART_EVENT_NAMES,
  chartEventSchema,
  INTERACTION_RULES,
  readChartEvent,
  toActionEvent,
} from './events';
import { chartEventExamples } from './examples/events';
import { metricSingleValue } from './examples/metric';
import { xyInteractive } from './examples/xy_chart';
import { nodeSchemaOf } from './schema.fixtures';

const { data } = xyInteractive;
const columnIndex = (id: string) =>
  data.columns.findIndex((column) => column.id === id);

describe('chart event examples', () => {
  it.each(chartEventExamples)('$name parses', ({ event }) => {
    expect(chartEventSchema.parse(event)).toEqual(event);
  });

  it.each(chartEventExamples.filter(({ event }) => event.kind === 'select'))(
    '$name names dimension columns every selected row shares',
    ({ event }) => {
      if (event.kind !== 'select') {
        return;
      }
      for (const id of event.columns) {
        const index = columnIndex(id);
        expect(data.columns[index]?.role).toBe('dimension');
        for (const row of event.rows) {
          expect(data.rows[row]?.[index]).toEqual(event.values[id]);
        }
      }
    }
  );

  it('selects every row of a legend item’s series', () => {
    const legend = chartEventExamples.find(
      ({ event }) => event.kind === 'select' && event.target === 'legend'
    )?.event;
    const status = columnIndex('status');
    expect(legend?.kind === 'select' ? legend.rows : []).toEqual(
      data.rows.flatMap((row, index) =>
        row[status] === 'Other' ? [index] : []
      )
    );
  });

  it('distinguishes selections of different series on the same row', () => {
    const [{ event }] = chartEventExamples as [
      (typeof chartEventExamples)[number],
    ];
    if (event.kind !== 'select') {
      throw new Error('The first chart event example must be a selection.');
    }

    const count = chartEventSchema.parse({ ...event, seriesKey: 'count' });
    const errors = chartEventSchema.parse({ ...event, seriesKey: 'errors' });

    expect(count).not.toEqual(errors);
    expect(count.kind === 'select' ? count.rows : []).toEqual(event.rows);
    expect(errors.kind === 'select' ? errors.rows : []).toEqual(event.rows);
  });

  it.each(['datum', 'series', 'legend'] as const)(
    'requires a series key for %s selections',
    (target) => {
      const result = chartEventSchema.safeParse({
        kind: 'select',
        node: 'responses',
        target,
        rows: [0],
        columns: ['time'],
        values: { time: 0 },
        description: '00:00',
      });
      expect(result.success).toBe(false);
    }
  );
});

describe('ActionEventRef', () => {
  it.each(chartEventExamples)(
    '$name round-trips through onEvent',
    ({ event }) => {
      const ref = toActionEvent(event);
      expect(ref.name).toBe(CHART_EVENT_NAMES[event.kind]);
      expect(readChartEvent(ref)).toEqual(event);
    }
  );

  it('reads nothing from another event, a mismatched name or a bad payload', () => {
    const [{ event }] = chartEventExamples as [(typeof chartEventExamples)[0]];
    expect(readChartEvent({ name: 'slide.next', context: { ...event } })).toBe(
      undefined
    );
    expect(
      readChartEvent({ name: CHART_EVENT_NAMES.brush, context: { ...event } })
    ).toBe(undefined);
    expect(
      readChartEvent({
        name: CHART_EVENT_NAMES.select,
        context: { kind: 'select' },
      })
    ).toBe(undefined);
  });
});

describe('interactions', () => {
  const issuesOf = (type: string, node: unknown) => {
    const result = nodeSchemaOf(type).safeParse(node);
    return result.success
      ? []
      : result.error.issues.map(({ path, message }) => ({
          path: path.join('.'),
          message,
        }));
  };

  it('rejects a brush along a string column', () => {
    const issues = issuesOf('xyChart', {
      ...xyInteractive,
      interactions: { brush: { column: 'status' } },
    });
    expect(issues).toContainEqual({
      path: 'interactions.brush.column',
      message: expect.stringContaining(INTERACTION_RULES.brushColumn) as string,
    });
  });

  it('rejects a numeric brush column that is not used as x', () => {
    expect(
      issuesOf('xyChart', {
        ...xyInteractive,
        interactions: { brush: { column: 'count' } },
      })
    ).toContainEqual({
      path: 'interactions.brush.column',
      message: INTERACTION_RULES.brushColumn,
    });
  });

  it('accepts a brush along an x column', () => {
    expect(
      issuesOf('xyChart', {
        ...xyInteractive,
        interactions: { brush: { column: 'time' } },
      })
    ).toEqual([]);
  });

  it('rejects emphasis past the last row', () => {
    expect(
      issuesOf('xyChart', { ...xyInteractive, emphasis: [{ rows: [12] }] })
    ).toEqual([
      {
        path: 'emphasis.0.rows.0',
        message: expect.stringContaining(
          INTERACTION_RULES.emphasisRows
        ) as string,
      },
    ]);
  });

  it('offers only tile selection and no brush on a metric', () => {
    expect(
      issuesOf('metric', {
        ...metricSingleValue,
        interactions: { select: ['datum'] },
      }).map(({ path }) => path)
    ).toEqual(['interactions.select.0']);
    expect(
      issuesOf('metric', {
        ...metricSingleValue,
        interactions: { brush: { column: 'count' } },
      }).length
    ).toBeGreaterThan(0);
  });
});
