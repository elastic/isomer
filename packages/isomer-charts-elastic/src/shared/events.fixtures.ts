/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChartEvent } from '@elastic/isomer-primitives-charts/scene';
import { chartEventExamples } from '@elastic/isomer-primitives-charts/schema';

export const NODE = 'responses';

export const expected = (name: string): ChartEvent => {
  const example = chartEventExamples.find((entry) => entry.name === name);
  if (!example) {
    throw new Error(`no example ${name}`);
  }
  return example.event;
};

export const listen = () => {
  const events: ChartEvent[] = [];
  return {
    events,
    env: {
      environment: 'browser' as const,
      nodeId: NODE,
      onEvent: (event: ChartEvent) => events.push(event),
    },
  };
};
