/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type CSSProperties, useId, useState } from 'react';
import type {
  LensDiagnostic,
  LensPlanResult,
  LensResponseResult,
} from '@elastic/isomer-lowering-lens';
import { plan, readResponse, readTable } from '@elastic/isomer-lowering-lens';

import { requestsResponse, twoLayerInput } from '../src/native_esql.fixtures';

const ROWS_SHOWN = 50;
const DIAGNOSTICS_SHOWN = 50;
const CELL_CHARACTERS = 200;
const TEXT_CHARACTERS = 100_000;

const box: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  padding: 12,
  border: '1px solid currentColor',
  borderRadius: 6,
  background: 'transparent',
  color: 'inherit',
  font: '13px/1.5 monospace',
};
const pre: CSSProperties = {
  ...box,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  maxHeight: 320,
  overflow: 'auto',
};
const cell: CSSProperties = {
  padding: '4px 8px',
  borderBottom: '1px solid currentColor',
  textAlign: 'left',
};

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

const clip = (text: string, limit: number) =>
  text.length > limit
    ? `${text.slice(0, limit)}… (${text.length - limit} more characters)`
    : text;

/** Parses editor text, refusing text longer than the inspector shows. */
const parse = (text: string): { value: unknown } | { error: string } => {
  if (text.length > 4_000_000) {
    return { error: 'The text is longer than 4,000,000 characters.' };
  }
  try {
    return { value: JSON.parse(text) as unknown };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
};

const Diagnostics = ({ items }: { items: readonly LensDiagnostic[] }) => (
  <ul role="alert" aria-label="Diagnostics">
    {items.slice(0, DIAGNOSTICS_SHOWN).map(({ code, message, path }, index) => (
      <li key={index}>
        <code>{code}</code> at{' '}
        <code>
          {clip(path.length ? path.join('.') : '(root)', CELL_CHARACTERS)}
        </code>
        : {clip(message, CELL_CHARACTERS)}
      </li>
    ))}
    {items.length > DIAGNOSTICS_SHOWN ? (
      <li>and {items.length - DIAGNOSTICS_SHOWN} more</li>
    ) : null}
  </ul>
);

export default function LensInspectorApp() {
  const id = useId();
  const [input, setInput] = useState(() => pretty(twoLayerInput()));
  const [response, setResponse] = useState(() => pretty(requestsResponse()));
  const [planned, setPlanned] = useState<LensPlanResult | { error: string }>();
  const [read, setRead] = useState<LensResponseResult | { error: string }>();
  const [layerId, setLayerId] = useState('');
  const layers =
    planned && 'status' in planned && planned.status === 'planned'
      ? planned.plan.layers
      : [];
  const layer = layers.find((entry) => entry.layerId === layerId);

  const runPlan = () => {
    const parsed = parse(input);
    const result = 'error' in parsed ? parsed : plan(parsed.value);
    setPlanned(result);
    setRead(undefined);
    setLayerId(
      'status' in result && result.status === 'planned'
        ? (result.plan.layers[0]?.layerId ?? '')
        : ''
    );
  };
  const runRead = () => {
    const parsed = parse(response);
    setRead(
      'error' in parsed
        ? parsed
        : layer?.kind === 'form'
          ? readTable(layer, parsed.value)
          : readResponse(layer, parsed.value)
    );
  };

  return (
    <section
      aria-label="Lens inspector"
      style={{ padding: 24, display: 'grid', gap: 12 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Lens inspector</h1>
      <p>
        Plans a native ES|QL or form-based Lens saved object and replays a
        recorded ES|QL response or Lens <code>Datatable</code> through{' '}
        <code>@elastic/isomer-lowering-lens</code>. Nothing is fetched or
        executed, and nothing is drawn: this shows the plan a host would run,
        not a chart.
      </p>
      <label htmlFor={`${id}-input`}>
        {'Planning input: { savedObject, dataViews? }'}
      </label>
      <textarea
        id={`${id}-input`}
        rows={14}
        style={box}
        value={input}
        onChange={(event) => {
          setInput(event.target.value);
          setPlanned(undefined);
          setRead(undefined);
        }}
      />
      <button type="button" style={{ justifySelf: 'start' }} onClick={runPlan}>
        Plan
      </button>
      {planned && 'error' in planned ? (
        <p role="alert">{planned.error}</p>
      ) : null}
      {planned && 'status' in planned && planned.status !== 'planned' ? (
        <>
          <p>Status: {planned.status}</p>
          <Diagnostics items={planned.diagnostics} />
        </>
      ) : null}
      {layers.length ? (
        <>
          <p>
            Status: planned, {layers.length}{' '}
            {layers.length === 1 ? 'layer' : 'layers'}
          </p>
          <label htmlFor={`${id}-layer`}>Layer</label>
          <select
            id={`${id}-layer`}
            value={layerId}
            style={{ ...box, width: 'auto', justifySelf: 'start' }}
            onChange={(event) => {
              setLayerId(event.target.value);
              setRead(undefined);
            }}>
            {layers.map((entry) => (
              <option key={entry.layerId} value={entry.layerId}>
                {entry.layerId}
              </option>
            ))}
          </select>
          <pre aria-label="Query" style={pre}>
            {layer?.kind === 'esql'
              ? clip(layer.query.esql, TEXT_CHARACTERS)
              : planned && 'status' in planned && planned.status === 'planned'
                ? clip(pretty(planned.plan.query ?? null), TEXT_CHARACTERS)
                : ''}
          </pre>
          <pre aria-label="Layer plan" style={pre}>
            {layer
              ? clip(
                  pretty(
                    layer.kind === 'esql'
                      ? { columns: layer.columns, host: layer.host }
                      : {
                          dataView: layer.dataView,
                          linkedTo: layer.linkedTo,
                          columns: layer.columns,
                          host: layer.host,
                        }
                  ),
                  TEXT_CHARACTERS
                )
              : ''}
          </pre>
          <label htmlFor={`${id}-response`}>
            {layer?.kind === 'form'
              ? "Lens Datatable: { type: 'datatable', columns, rows }"
              : 'Recorded ES|QL response: { columns, values }'}
          </label>
          <textarea
            id={`${id}-response`}
            rows={10}
            style={box}
            value={response}
            onChange={(event) => {
              setResponse(event.target.value);
              setRead(undefined);
            }}
          />
          <button
            type="button"
            style={{ justifySelf: 'start' }}
            onClick={runRead}>
            Read response
          </button>
        </>
      ) : null}
      {read && 'error' in read ? <p role="alert">{read.error}</p> : null}
      {read && 'status' in read && read.status === 'invalid' ? (
        <Diagnostics items={read.diagnostics} />
      ) : null}
      {read && 'status' in read && read.status === 'ready' ? (
        <>
          <p>
            {read.table.rows.length > ROWS_SHOWN
              ? `Showing ${ROWS_SHOWN} of ${read.table.rows.length} rows.`
              : `${read.table.rows.length} rows.`}
          </p>
          <table
            aria-label="Projected table"
            style={{ borderCollapse: 'collapse', font: '13px/1.5 monospace' }}>
            <thead>
              <tr>
                {read.table.columns.map(({ lens, type }) => (
                  <th key={lens.columnId} style={cell}>
                    {lens.label ?? lens.columnId}{' '}
                    <small>
                      ({lens.fieldName}: {type})
                    </small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {read.table.rows.slice(0, ROWS_SHOWN).map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((value, index) => (
                    <td key={index} style={cell}>
                      {clip(JSON.stringify(value), CELL_CHARACTERS)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  );
}
