/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CSSProperties, useId, useState } from 'react';

import { inspectorOutput } from './inspector_output';
import { plan } from './plan';
import { readResponse } from './read_response';
import type { LensLoweringResult } from './types';

export interface LensInspectorProps {
  /** Initial JSON for { savedObject, dataViews? }. No retrieval or execution occurs. */
  initialInput?: string;
  initialResponse?: string;
}

const editorStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  padding: 12,
  border: '1px solid currentColor',
  borderRadius: 6,
  background: 'transparent',
  color: 'inherit',
  fontFamily: 'monospace',
  fontSize: 13,
  lineHeight: 1.5,
};
const resultStyle: CSSProperties = {
  ...editorStyle,
  maxHeight: 320,
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};
const buttonStyle: CSSProperties = {
  alignSelf: 'start',
  padding: '8px 12px',
  border: '1px solid currentColor',
  borderRadius: 6,
  fontWeight: 600,
};

const parseJson = (text: string): { value: unknown } | { error: string } => {
  if (text.length > 2_000_000) {
    return { error: 'JSON text exceeds 2,000,000 characters' };
  }
  try {
    return { value: JSON.parse(text) as unknown };
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }
    return { error: error.message };
  }
};

/** A local, browser-only inspector. It never executes the displayed query. */
export const LensInspector = ({
  initialInput = '',
  initialResponse = '',
}: LensInspectorProps) => {
  const id = useId();
  const [input, setInput] = useState(initialInput);
  const [response, setResponse] = useState(initialResponse);
  const [result, setResult] = useState<LensLoweringResult>();
  const [resultText, setResultText] = useState<string>();
  const [projection, setProjection] = useState<string>();
  const [inputError, setInputError] = useState<string>();
  const [responseError, setResponseError] = useState<string>();
  const [layerId, setLayerId] = useState('');
  const query =
    result?.status === 'planned'
      ? result.plan.queries.find((entry) => entry.layerId === layerId)
      : undefined;

  const inspectEnvelope = () => {
    const parsed = parseJson(input);
    setProjection(undefined);
    setResponseError(undefined);
    if ('error' in parsed) {
      setInputError(parsed.error);
      setResult(undefined);
      setResultText(undefined);
      return;
    }
    const next = plan(parsed.value);
    const output = inspectorOutput(next);
    setInputError('error' in output ? output.error : undefined);
    setResultText('text' in output ? output.text : undefined);
    setResult(next);
    setLayerId(
      next.status === 'planned' ? (next.plan.queries[0]?.layerId ?? '') : ''
    );
  };
  const inspectResponse = () => {
    if (!query) {
      return;
    }
    const parsed = parseJson(response);
    if ('error' in parsed) {
      setResponseError(parsed.error);
      setProjection(undefined);
      return;
    }
    const output = inspectorOutput(readResponse(query, parsed.value));
    setResponseError('error' in output ? output.error : undefined);
    setProjection('text' in output ? output.text : undefined);
  };
  return (
    <section
      aria-label="Lens envelope and response inspector"
      style={{
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.25 }}>
        Lens inspector
      </h1>
      <p style={{ lineHeight: 1.5 }}>
        Native ES|QL only. Local response replay is not backend execution
        parity. No saved objects, metadata or queries are fetched or executed.
      </p>
      <label htmlFor={`${id}-input`}>Planning input JSON</label>
      <textarea
        id={`${id}-input`}
        value={input}
        rows={16}
        style={editorStyle}
        onChange={(event) => {
          setInput(event.target.value);
          setResult(undefined);
          setResultText(undefined);
          setProjection(undefined);
          setInputError(undefined);
          setResponseError(undefined);
        }}
      />
      <button type="button" style={buttonStyle} onClick={inspectEnvelope}>
        Inspect envelope
      </button>
      {inputError ? <p role="alert">{inputError}</p> : null}
      {resultText ? (
        <pre aria-label="Planning result" style={resultStyle}>
          {resultText}
        </pre>
      ) : null}
      {result?.status === 'planned' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label htmlFor={`${id}-layer`}>Response layer</label>
          <select
            id={`${id}-layer`}
            value={layerId}
            style={{ ...editorStyle, width: 'auto', alignSelf: 'start' }}
            onChange={(event) => {
              setLayerId(event.target.value);
              setProjection(undefined);
              setResponseError(undefined);
            }}>
            {result.plan.queries.map((entry) => (
              <option key={entry.layerId} value={entry.layerId}>
                {entry.layerId}
              </option>
            ))}
          </select>
          <label htmlFor={`${id}-response`}>ES|QL response JSON</label>
          <textarea
            id={`${id}-response`}
            value={response}
            rows={10}
            style={editorStyle}
            onChange={(event) => {
              setResponse(event.target.value);
              setProjection(undefined);
              setResponseError(undefined);
            }}
          />
          <button type="button" style={buttonStyle} onClick={inspectResponse}>
            Inspect response
          </button>
          {responseError ? <p role="alert">{responseError}</p> : null}
          {projection ? (
            <pre aria-label="Response result" style={resultStyle}>
              {projection}
            </pre>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};
