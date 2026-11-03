/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@elastic/charts/dist/theme_only_light.css';

import { useState } from 'react';
import {
  metricExamples,
  metricSchema,
} from '@elastic/isomer-primitives-charts/model';
import { elasticChartsPack } from '@elastic/isomer-renderers-elastic-charts';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { StudioAppProps } from '@elastic/isomer-studio';

const runtime = createIsomerRuntime({ packs: [elasticChartsPack] });

const describeIssues = (
  source: string
): ReturnType<typeof metricSchema.safeParse> | string => {
  try {
    return metricSchema.safeParse(JSON.parse(source));
  } catch (caught) {
    return (caught as Error).message;
  }
};

export default function MetricApp({ theme }: StudioAppProps) {
  const [source, setSource] = useState(
    JSON.stringify(metricExamples[0], null, 2)
  );
  const [action, setAction] = useState('');
  const parsed = describeIssues(source);
  const error =
    typeof parsed === 'string'
      ? parsed
      : parsed.error?.issues
          .map(({ path, message }) => `${path.join('.')}: ${message}`)
          .join('\n');
  return (
    <section style={{ padding: 16 }}>
      <h1>Metric</h1>
      <label>
        Example{' '}
        <select
          onChange={({ target }) => {
            setSource(
              JSON.stringify(metricExamples[Number(target.value)], null, 2)
            );
            setAction('');
          }}>
          {metricExamples.map((example, index) => (
            <option key={example.tiles[0]!.key} value={index}>
              {example.tiles.map(({ key }) => key).join(', ')}
            </option>
          ))}
        </select>
      </label>
      {typeof parsed !== 'string' && parsed.success ? (
        <div style={{ colorScheme: theme }}>
          {runtime.surfaces.react.renderNode(parsed.data, {
            context: { onEvent: (event) => setAction(JSON.stringify(event)) },
          })}
        </div>
      ) : null}
      {error ? <pre role="alert">{error}</pre> : null}
      {action ? <output aria-label="Metric action">{action}</output> : null}
      <label style={{ display: 'block' }}>
        Metric JSON
        <textarea
          value={source}
          onChange={({ target }) => setSource(target.value)}
          rows={16}
          style={{ display: 'block', width: '100%', fontFamily: 'monospace' }}
        />
      </label>
    </section>
  );
}
