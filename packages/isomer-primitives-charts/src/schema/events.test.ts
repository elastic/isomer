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
    expect(
      issuesOf('xyChart', {
        ...xyInteractive,
        interactions: { brush: { column: 'status' } },
      })
    ).toEqual([
      {
        path: 'interactions.brush.column',
        message: expect.stringContaining(
          INTERACTION_RULES.brushColumn
        ) as string,
      },
    ]);
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
