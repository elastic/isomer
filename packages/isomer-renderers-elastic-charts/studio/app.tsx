/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@elastic/charts/dist/theme_light.css';

import { useState } from 'react';
import { metricExamples } from '@elastic/isomer-primitives-charts';
import { metricTrendSchema } from '@elastic/isomer-primitives-charts/model';
import {
  elasticChartsThemes,
  MetricTrendChart,
} from '@elastic/isomer-renderers-elastic-charts';
import type { StudioAppProps } from '@elastic/isomer-studio';

export default function MetricApp({ theme }: StudioAppProps) {
  const [selected, setSelected] = useState(0);
  const [source, setSource] = useState(
    JSON.stringify(metricExamples[0], null, 2)
  );
  const [lastAction, setLastAction] = useState('');
  let result: ReturnType<typeof metricTrendSchema.safeParse> | undefined;
  let error: string | undefined;
  try {
    result = metricTrendSchema.safeParse(JSON.parse(source));
    if (!result.success) {
      error = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
    }
  } catch (caught) {
    if (!(caught instanceof SyntaxError)) {
      throw caught;
    }
    error = caught.message;
  }
  return (
    <section
      style={{ padding: elasticChartsThemes[theme].tokens.frame.padding }}>
      <h1>Metric / trend</h1>
      <p>
        Portable metric fixtures and Elastic Charts browser rendering. Synthetic
        examples are not real Lens parity or backend execution.
      </p>
      <label>
        Metric example{' '}
        <select
          value={selected}
          onChange={(event) => {
            const index = Number(event.target.value);
            setSelected(index);
            setSource(JSON.stringify(metricExamples[index], null, 2));
            setLastAction('');
          }}>
          {metricExamples.map((example, index) => (
            <option key={example.title} value={index}>
              {example.title}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: 'block' }}>
        Metric model JSON
        <textarea
          aria-label="Metric model JSON"
          value={source}
          onChange={(event) => {
            setSource(event.target.value);
            setLastAction('');
          }}
          rows={10}
          style={{ display: 'block', width: '100%' }}
        />
      </label>
      {error ? <pre role="alert">{error}</pre> : null}
      {result?.success ? (
        <MetricTrendChart
          node={result.data}
          theme={elasticChartsThemes[theme]}
          context={{ onEvent: (event) => setLastAction(JSON.stringify(event)) }}
        />
      ) : null}
      {lastAction ? (
        <output aria-label="Metric action">{lastAction}</output>
      ) : null}
    </section>
  );
}
