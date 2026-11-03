/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBasicTable,
  type EuiBasicTableColumn,
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFormRow,
  EuiSelect,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import type {
  JsonValue,
  LensDiagnostic,
  LensLayerPlan,
  LensPlanResult,
  LensResponseResult,
  LensTable,
} from '@elastic/isomer-lowering-lens';
import { plan, readResponse } from '@elastic/isomer-lowering-lens';

import { requestsResponse, twoLayerInput } from '../src/native_esql.fixtures';

const ROWS_SHOWN = 50;
const DIAGNOSTICS_SHOWN = 50;
const CELL_CHARACTERS = 200;
const TEXT_CHARACTERS = 100_000;

/** What a button produced: text that did not parse, or the package's result. */
type Outcome<T> =
  { kind: 'unparsed'; message: string } | { kind: 'result'; result: T };

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

const clip = (text: string, limit: number) =>
  text.length > limit
    ? `${text.slice(0, limit)}… (${text.length - limit} more characters)`
    : text;

/** Parses editor text into `run`'s argument, refusing text longer than the inspector shows. */
const runOn = <T,>(text: string, run: (value: unknown) => T): Outcome<T> => {
  if (text.length > 4_000_000) {
    return {
      kind: 'unparsed',
      message: 'The text is longer than 4,000,000 characters.',
    };
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return {
      kind: 'unparsed',
      message: error instanceof Error ? error.message : String(error),
    };
  }
  return { kind: 'result', result: run(value) };
};

const Unparsed = ({ message }: { message: string }) => (
  <EuiCallOut role="alert" color="danger" title={message} size="s" />
);

const Diagnostics = ({ items }: { items: readonly LensDiagnostic[] }) => (
  <EuiText size="s">
    <ul role="alert" aria-label="Diagnostics">
      {items
        .slice(0, DIAGNOSTICS_SHOWN)
        .map(({ code, message, path }, index) => (
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
  </EuiText>
);

const JsonInput = ({
  label,
  rows,
  value,
  onChange,
}: {
  label: string;
  rows: number;
  value: string;
  onChange: (value: string) => void;
}) => (
  <EuiFormRow label={label} fullWidth>
    <EuiTextArea
      fullWidth
      rows={rows}
      value={value}
      style={{ fontFamily: 'monospace' }}
      onChange={({ target }) => onChange(target.value)}
    />
  </EuiFormRow>
);

const Code = ({ label, text }: { label: string; text: string }) => (
  <div aria-label={label} role="region">
    <EuiCodeBlock
      language={label === 'Query' ? 'text' : 'json'}
      overflowHeight={320}
      paddingSize="s"
      fontSize="s"
      isCopyable>
      {clip(text, TEXT_CHARACTERS)}
    </EuiCodeBlock>
  </div>
);

const LayerView = ({
  layers,
  layer,
  onSelect,
}: {
  layers: readonly LensLayerPlan[];
  layer: LensLayerPlan | undefined;
  onSelect: (layerId: string) => void;
}) => (
  <>
    <EuiText size="s">
      <p>
        Status: planned, {layers.length}{' '}
        {layers.length === 1 ? 'layer' : 'layers'}
      </p>
    </EuiText>
    <EuiFormRow label="Layer">
      <EuiSelect
        value={layer?.layerId ?? ''}
        options={layers.map(({ layerId }) => ({
          value: layerId,
          text: layerId,
        }))}
        onChange={({ target }) => onSelect(target.value)}
      />
    </EuiFormRow>
    {layer ? (
      <>
        <Code label="Query" text={layer.query.esql} />
        <Code
          label="Layer plan"
          text={pretty({ columns: layer.columns, host: layer.host })}
        />
      </>
    ) : null}
  </>
);

type Row = { id: number; cells: readonly JsonValue[] };

const ProjectedTable = ({ table }: { table: LensTable }) => {
  const { rows, columns, partial } = table;
  const items: Row[] = rows
    .slice(0, ROWS_SHOWN)
    .map((cells, id) => ({ id, cells }));
  const tableColumns: EuiBasicTableColumn<Row>[] = columns.map(
    ({ lens: { columnId, label, fieldName }, type }, index) => ({
      name: (
        <span key={columnId}>
          {label ?? columnId}{' '}
          <small>
            ({fieldName}: {type})
          </small>
        </span>
      ),
      render: ({ cells }: Row) =>
        clip(JSON.stringify(cells[index]), CELL_CHARACTERS),
    })
  );
  return (
    <>
      <EuiText size="s">
        <p>
          {rows.length > ROWS_SHOWN
            ? `Showing ${ROWS_SHOWN} of ${rows.length} rows.`
            : `${rows.length} rows.`}
        </p>
      </EuiText>
      {partial ? (
        <EuiCallOut
          color="warning"
          size="s"
          title="Partial response: Elasticsearch marked it is_partial, and Kibana draws it with a warning."
        />
      ) : null}
      <EuiBasicTable
        tableCaption="Projected table"
        items={items}
        itemId="id"
        columns={tableColumns}
        responsiveBreakpoint={false}
      />
    </>
  );
};

const PlanOutcome = ({
  outcome,
}: {
  outcome: Outcome<LensPlanResult> | undefined;
}) => {
  if (outcome?.kind === 'unparsed') {
    return <Unparsed message={outcome.message} />;
  }
  if (
    outcome?.result.status === 'invalid' ||
    outcome?.result.status === 'unsupported'
  ) {
    return (
      <>
        <EuiText size="s">
          <p>Status: {outcome.result.status}</p>
        </EuiText>
        <Diagnostics items={outcome.result.diagnostics} />
      </>
    );
  }
  return null;
};

const ResponseOutcome = ({
  outcome,
}: {
  outcome: Outcome<LensResponseResult> | undefined;
}) => {
  if (outcome?.kind === 'unparsed') {
    return <Unparsed message={outcome.message} />;
  }
  if (outcome?.result.status === 'invalid') {
    return <Diagnostics items={outcome.result.diagnostics} />;
  }
  if (outcome?.result.status === 'ready') {
    return <ProjectedTable table={outcome.result.table} />;
  }
  return null;
};

const LensInspectorApp = () => {
  const [input, setInput] = useState(() => pretty(twoLayerInput()));
  const [response, setResponse] = useState(() => pretty(requestsResponse()));
  const [planned, setPlanned] = useState<Outcome<LensPlanResult>>();
  const [read, setRead] = useState<Outcome<LensResponseResult>>();
  const [layerId, setLayerId] = useState('');
  const layers =
    planned?.kind === 'result' && planned.result.status === 'planned'
      ? planned.result.plan.layers
      : [];
  const layer = layers.find((entry) => entry.layerId === layerId);

  const runPlan = () => {
    const outcome = runOn(input, plan);
    setPlanned(outcome);
    setRead(undefined);
    setLayerId(
      outcome.kind === 'result' && outcome.result.status === 'planned'
        ? (outcome.result.plan.layers[0]?.layerId ?? '')
        : ''
    );
  };

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      aria-label="Lens inspector"
      role="region"
      style={{ padding: 24 }}>
      <EuiTitle size="m">
        <h1>Lens inspector</h1>
      </EuiTitle>
      <EuiText size="s">
        <p>
          Plans a native ES|QL Lens saved object and replays a recorded response
          through <code>@elastic/isomer-lowering-lens</code>. Nothing is fetched
          or executed, and nothing is drawn: this shows the plan a host would
          run, not a chart.
        </p>
      </EuiText>
      <JsonInput
        label="Planning input: { savedObject, dataViews? }"
        rows={14}
        value={input}
        onChange={(value) => {
          setInput(value);
          setPlanned(undefined);
          setRead(undefined);
        }}
      />
      <div>
        <EuiButton size="s" onClick={runPlan}>
          Plan
        </EuiButton>
      </div>
      <PlanOutcome outcome={planned} />
      {layers.length ? (
        <>
          <LayerView
            {...{ layers, layer }}
            onSelect={(selected) => {
              setLayerId(selected);
              setRead(undefined);
            }}
          />
          <JsonInput
            label="Recorded ES|QL response: { columns, values }"
            rows={10}
            value={response}
            onChange={(value) => {
              setResponse(value);
              setRead(undefined);
            }}
          />
          <div>
            <EuiButton
              size="s"
              onClick={() =>
                setRead(runOn(response, (value) => readResponse(layer, value)))
              }>
              Read response
            </EuiButton>
          </div>
        </>
      ) : null}
      <ResponseOutcome outcome={read} />
    </EuiFlexGroup>
  );
};

export default LensInspectorApp;
