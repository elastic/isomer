/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type CSSProperties, useId, useMemo, useState } from 'react';
import type { LensDiagnostic, LensTable } from '@elastic/isomer-lowering-lens';
import { plan } from '@elastic/isomer-lowering-lens';
import { bind } from '@elastic/isomer-lowering-lens/charts';
import type { Composition } from '@elastic/isomer-sdk';
import type { StudioAppProps } from '@elastic/isomer-studio';

import { SAMPLES } from './samples';
import { synthesize, SYNTHETIC_LABEL } from './synthetic';

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
const banner: CSSProperties = {
  padding: '8px 12px',
  border: '1px dashed currentColor',
  borderRadius: 6,
  fontWeight: 600,
};

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

const Diagnostics = ({ items }: { items: readonly LensDiagnostic[] }) => (
  <ul role="alert" aria-label="Diagnostics">
    {items.map(({ code, message, path }, index) => (
      <li key={index}>
        <code>{code}</code> at{' '}
        <code>{path.length ? path.join('.') : '(root)'}</code>: {message}
      </li>
    ))}
  </ul>
);

type Outcome =
  | { stage: 'input'; error: string }
  | {
      stage: 'plan' | 'data' | 'bind' | 'validate';
      diagnostics: LensDiagnostic[];
      planned?: unknown;
      tables?: LensTable[];
    }
  | {
      stage: 'ready';
      planned: unknown;
      tables: LensTable[];
      composition: Composition;
    };

const run = (
  text: string,
  seed: string,
  dates: { format: string; timeZone: string },
  theme: StudioAppProps['theme'],
  validate: StudioAppProps['runtime']['validate']
): Outcome => {
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch (error) {
    return {
      stage: 'input',
      error: error instanceof Error ? error.message : String(error),
    };
  }
  const planned = plan(input);
  if (planned.status !== 'planned') {
    return { stage: 'plan', diagnostics: [...planned.diagnostics] };
  }
  const visualization = planned.plan.source.attributes.state.visualization;
  // Synthetic ES|QL columns are keyed by field name, form-based ones by column ID.
  const { maxAccessor } = visualization;
  const maxColumns = new Set(
    planned.plan.layers.flatMap((layer) =>
      layer.kind === 'esql'
        ? layer.columns
            .filter(({ columnId }) => columnId === maxAccessor)
            .map(({ fieldName }) => fieldName)
        : typeof maxAccessor === 'string'
          ? [maxAccessor]
          : []
    )
  );
  const read = synthesize(planned.plan, { seed, maxColumns });
  const failed = read.flatMap(({ result }) =>
    result.status === 'ready' ? [] : result.diagnostics
  );
  if (failed.length) {
    return { stage: 'data', diagnostics: failed, planned: planned.plan };
  }
  const tables = read.flatMap(({ result }) =>
    result.status === 'ready' ? [result.table] : []
  );
  const bound = bind(planned.plan, tables, {
    filterAction: 'lens/filter',
    dates,
  });
  if (bound.status !== 'bound') {
    return {
      stage: 'bind',
      diagnostics: [...bound.diagnostics],
      planned: planned.plan,
      tables,
    };
  }
  // The React surface does not validate, so the app renders the copy `validate` checked.
  const checked = validate({ type: 'view', body: [bound.node], theme });
  if (!checked.valid || !checked.composition) {
    return {
      stage: 'validate',
      diagnostics: checked.errors.map(({ code, message, path }) => ({
        code: code ?? 'isomer.validation',
        message,
        path: path ? path.split('.') : [],
      })),
      planned: planned.plan,
      tables,
    };
  }
  return {
    stage: 'ready',
    planned: planned.plan,
    tables,
    composition: checked.composition,
  };
};

/** Paste a Lens saved object, bind it to synthetic data, and draw the chart Isomer gives it. */
export default function LensPasteApp({
  Preview,
  runtime,
  theme,
}: StudioAppProps) {
  const id = useId();
  const [sample, setSample] = useState<string>(SAMPLES[0].id);
  const [text, setText] = useState(() => pretty(SAMPLES[0].input()));
  const [seed, setSeed] = useState('isomer');
  const [format, setFormat] = useState('MMM D, YYYY @ HH:mm:ss.SSS');
  const [timeZone, setTimeZone] = useState('UTC');
  const [submitted, setSubmitted] = useState(text);
  const outcome = useMemo(
    () =>
      run(submitted, seed, { format, timeZone }, theme, (composition) =>
        runtime.validate(composition)
      ),
    [submitted, seed, format, timeZone, theme, runtime]
  );

  return (
    <main style={{ display: 'grid', gap: 16, padding: 24, maxWidth: 1100 }}>
      <h1 style={{ margin: 0 }}>Lens to chart</h1>
      <p style={banner} role="note">
        {SYNTHETIC_LABEL}
      </p>
      <label htmlFor={`${id}-sample`}>
        Sample{' '}
        <select
          id={`${id}-sample`}
          value={sample}
          onChange={({ target: { value } }) => {
            const chosen = SAMPLES.find((candidate) => candidate.id === value)!;
            const next = pretty(chosen.input());
            setSample(value);
            setText(next);
            setSubmitted(next);
          }}>
          {SAMPLES.map(({ id: value, title }) => (
            <option key={value} value={value}>
              {title}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor={`${id}-input`}>
        Saved object, as <code>{'{ savedObject, dataViews? }'}</code>
      </label>
      <textarea
        id={`${id}-input`}
        aria-label="Lens saved object"
        style={{ ...box, minHeight: 240 }}
        value={text}
        spellCheck={false}
        onChange={({ target: { value } }) => setText(value)}
      />
      <div
        style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          alignItems: 'end',
        }}>
        <label>
          Seed{' '}
          <input
            aria-label="Seed"
            value={seed}
            onChange={({ target: { value } }) => setSeed(value)}
          />
        </label>
        <label>
          Date format{' '}
          <input
            aria-label="Date format"
            value={format}
            onChange={({ target: { value } }) => setFormat(value)}
          />
        </label>
        <label>
          Time zone{' '}
          <input
            aria-label="Time zone"
            value={timeZone}
            onChange={({ target: { value } }) => setTimeZone(value)}
          />
        </label>
        <button type="button" onClick={() => setSubmitted(text)}>
          Convert
        </button>
      </div>

      {outcome.stage === 'input' ? (
        <p role="alert">The input is not JSON: {outcome.error}</p>
      ) : outcome.stage === 'ready' ? (
        <section aria-label="Chart" style={{ display: 'grid', gap: 12 }}>
          <Preview composition={outcome.composition} />
          <p style={banner}>{SYNTHETIC_LABEL}</p>
          <details open>
            <summary>Composition</summary>
            <button
              type="button"
              onClick={() =>
                void navigator.clipboard?.writeText(
                  `// ${SYNTHETIC_LABEL}\n${pretty(outcome.composition)}`
                )
              }>
              Copy
            </button>
            <pre style={pre} aria-label="Composition JSON">
              {pretty(outcome.composition)}
            </pre>
          </details>
        </section>
      ) : (
        <section aria-label="Refused" style={{ display: 'grid', gap: 12 }}>
          <p>
            {outcome.stage === 'plan'
              ? 'The saved object could not be planned.'
              : outcome.stage === 'data'
                ? 'Synthetic data could not be read back.'
                : outcome.stage === 'bind'
                  ? 'The plan could not be bound to a chart.'
                  : 'The chart failed validation.'}
          </p>
          <Diagnostics items={outcome.diagnostics} />
        </section>
      )}

      {outcome.stage !== 'input' && 'planned' in outcome && outcome.planned ? (
        <details>
          <summary>Plan</summary>
          <pre style={pre} aria-label="Plan JSON">
            {pretty(outcome.planned)}
          </pre>
        </details>
      ) : null}
      {outcome.stage !== 'input' && 'tables' in outcome && outcome.tables ? (
        <details>
          <summary>Synthetic tables</summary>
          <pre style={pre} aria-label="Synthetic tables">
            {pretty(outcome.tables)}
          </pre>
        </details>
      ) : null}
    </main>
  );
}
