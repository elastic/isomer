/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Composition } from '@elastic/isomer-sdk';
import type { StudioAppProps } from '@elastic/isomer-studio';

import {
  CAPTURED,
  FONTS,
} from '../../../../isomer-lowering-lens/comparison/__fixtures__/index';
import {
  caseSchema,
  isHoldout,
  platformOf,
} from '../../../../isomer-lowering-lens/comparison/case';
import {
  compareFingerprints,
  type Difference,
  failures,
} from '../../../../isomer-lowering-lens/comparison/compare';
import {
  type Fingerprint,
  FINGERPRINT_KINDS,
} from '../../../../isomer-lowering-lens/comparison/fingerprint';
import { modelReadings } from '../../../../isomer-lowering-lens/comparison/model';
import { replay } from '../../../../isomer-lowering-lens/comparison/replay';

/** Where this page draws, as a capture records it. */
const drawnOn = platformOf(navigator.platform);

/** A bundled asset's URL: bundlers emit them relative to the importing chunk, not the page. */
const asset = (src: string) => new URL(src, import.meta.url).href;

const CASES = CAPTURED.map(({ data, screenshot }) => ({
  comparison: caseSchema.parse(data),
  screenshot: asset(screenshot),
}));

/** Registers the font files Kibana drew the references with, once per page. */
const fontsLoaded = Promise.all(
  FONTS.map(async ({ family, weight, src, unicodeRange }) => {
    const face = new FontFace(family, `url(${asset(src)})`, {
      weight,
      ...(unicodeRange ? { unicodeRange } : {}),
    });
    document.fonts.add(face);
    await face.load();
  })
);

const pre: CSSProperties = {
  boxSizing: 'border-box',
  padding: 12,
  border: '1px solid currentColor',
  borderRadius: 6,
  font: '13px/1.5 monospace',
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
const cell: CSSProperties = {
  padding: '4px 8px',
  borderBottom: '1px solid currentColor',
  textAlign: 'left',
  verticalAlign: 'top',
};

const pretty = (value: unknown) =>
  value === undefined
    ? '—'
    : typeof value === 'string'
      ? value
      : JSON.stringify(value);

/** The resolved model's value for a fingerprint field, where the model has one. */
const modelValue = (
  readings: readonly Record<string, unknown>[],
  path: string
) => {
  const match = /^tiles\[(\d+)\]\.(.+)$/.exec(path);
  return match ? readings[Number(match[1])]?.[match[2]!] : undefined;
};

/**
 * Reads a drawing once two reads agree, since Elastic Charts fits metric text after layout, and again whenever
 * the drawing changes afterwards, as on a hot update of its markup or styles. A read belongs to its `key`, so a new case or theme stays
 * pending until its own drawing settles.
 */
const useSettledFingerprint = (
  root: ShadowRoot | null,
  extract: (element: Element) => Fingerprint | null,
  key: string
) => {
  const [settled, setSettled] = useState<
    { key: string; fingerprint: Fingerprint | null } | undefined
  >(undefined);
  useEffect(() => {
    if (!root) {
      return undefined;
    }
    let timer: ReturnType<typeof setInterval> | undefined;
    let current: string | undefined;
    const read = () => {
      const host = root.firstElementChild;
      return host ? extract(host) : null;
    };
    const settle = () => {
      clearInterval(timer);
      setSettled(undefined);
      let previous = '';
      let reads = 0;
      timer = setInterval(() => {
        const fingerprint = read();
        const serialized = JSON.stringify(fingerprint);
        reads += 1;
        if ((fingerprint && serialized === previous) || reads > 40) {
          clearInterval(timer);
          timer = undefined;
          current = serialized;
          setSettled({ key, fingerprint });
        }
        previous = serialized;
      }, 150);
    };
    settle();
    // Re-renders that leave the drawing as it was do not restart the read.
    const recheck = () => {
      if (timer === undefined && JSON.stringify(read()) !== current) {
        settle();
      }
    };
    const observer = new MutationObserver(recheck);
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    // Stylesheet changes, such as a CSS hot update, mutate no node the observer sees.
    const watch = setInterval(recheck, 1000);
    return () => {
      clearInterval(timer);
      clearInterval(watch);
      observer.disconnect();
    };
  }, [root, extract, key]);
  return settled?.key === key ? settled.fingerprint : undefined;
};

/** Compares Isomer's drawing of each captured Lens panel with Kibana's, from the same saved state and data. */
export default function LensComparisonApp({
  Preview,
  runtime,
  theme,
  path,
  navigate,
}: StudioAppProps) {
  const [fonts, setFonts] = useState<'loading' | 'ready' | Error>('loading');
  useEffect(() => {
    fontsLoaded.then(
      () => setFonts('ready'),
      (error: unknown) =>
        setFonts(error instanceof Error ? error : new Error(String(error)))
    );
  }, []);
  const fontsReady = fonts === 'ready';
  const [includeHoldout, setIncludeHoldout] = useState(false);
  const [overlay, setOverlay] = useState(false);
  const [opacity, setOpacity] = useState(0.5);
  const requested = decodeURIComponent(path.replace(/\/$/, ''));
  const listed = useMemo(
    () =>
      CASES.filter(
        ({ comparison }) =>
          includeHoldout ||
          !isHoldout(comparison) ||
          comparison.id === requested
      ),
    [includeHoldout, requested]
  );
  const found = CASES.find(({ comparison }) => comparison.id === requested);
  // An unknown case is reported, never replaced by another one.
  const missing = requested !== '' && !found;
  const selected = found ?? listed[0]!;
  const { comparison, screenshot } = selected;
  const { fingerprint: reference } = comparison.reference;
  const { width, height } = reference;

  const replayed = useMemo(() => replay(comparison), [comparison]);
  const readings = useMemo(
    () =>
      replayed.status === 'bound'
        ? modelReadings(replayed.node, comparison.context.scheme, reference)
        : [],
    [replayed, comparison, reference]
  );
  const composition = useMemo((): Composition | undefined => {
    if (replayed.status !== 'bound') {
      return undefined;
    }
    const checked = runtime.validate({
      type: 'view',
      body: [replayed.node],
      theme,
    });
    return checked.valid ? checked.composition : undefined;
  }, [replayed, runtime, theme]);

  const view = `${comparison.id}/${theme}`;
  const [root, setRoot] = useState<{ view: string; shadow: ShadowRoot } | null>(
    null
  );
  const committed = useRef<ShadowRoot | null>(null);
  const onCommit = useCallback(
    (shadow: ShadowRoot) => {
      if (committed.current !== shadow) {
        committed.current = shadow;
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(
          ':host{display:block;height:100%}section.isomer{height:100%}'
        );
        shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheet];
        setRoot({ view, shadow });
      }
    },
    [view]
  );
  const drawn = useSettledFingerprint(
    root?.view === view ? root.shadow : null,
    FINGERPRINT_KINDS[reference.kind].extract,
    view
  );
  const differences: Difference[] | undefined =
    drawn === undefined
      ? undefined
      : compareFingerprints(reference, drawn, {
          expected: comparison.context,
          drawn: {
            scheme: theme === 'dark' ? 'dark' : 'light',
            deviceScaleFactor: window.devicePixelRatio,
            platform: drawnOn,
          },
        });
  const failing = differences && failures(differences);
  const status = missing
    ? 'missing'
    : replayed.status !== 'bound'
      ? 'refused'
      : fonts instanceof Error
        ? 'error'
        : failing === undefined
          ? 'pending'
          : failing.length
            ? 'fail'
            : 'pass';

  return (
    <div style={{ display: 'grid', gap: 16, padding: 24 }}>
      <h1 style={{ margin: 0 }}>Lens comparison</h1>
      <p style={banner} role="note">
        Kibana {comparison.provenance.kibana.version} (
        {comparison.provenance.kibana.build}) drew the reference with Elastic
        Charts {comparison.provenance.elasticCharts}. Isomer replays the data
        Lens used for it.
      </p>
      <div
        style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
        <label>
          Case{' '}
          <select
            aria-label="Case"
            value={comparison.id}
            onChange={({ target: { value } }) =>
              navigate(encodeURIComponent(value))
            }>
            {listed.map(({ comparison: { id, title, context } }) => (
              <option key={id} value={id}>
                {title} ({context.scheme})
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={includeHoldout}
            onChange={({ target: { checked } }) => setIncludeHoldout(checked)}
          />{' '}
          Include held-out cases
        </label>
        <label>
          <input
            type="checkbox"
            checked={overlay}
            onChange={({ target: { checked } }) => setOverlay(checked)}
          />{' '}
          Overlay
        </label>
        {overlay ? (
          <label>
            Isomer opacity{' '}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={opacity}
              onChange={({ target: { value } }) => setOpacity(Number(value))}
            />
          </label>
        ) : null}
      </div>
      {drawnOn !== comparison.context.platform ? (
        <p role="note">
          This case was captured in {comparison.context.platform} Chromium,
          which rasterizes text differently; text widths are compared only
          there.
        </p>
      ) : null}
      {theme !== comparison.context.scheme ? (
        <p role="alert">
          This case was captured in {comparison.context.scheme} mode; switch the
          Studio to match.
        </p>
      ) : null}

      <div
        style={{
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
          alignItems: 'start',
        }}>
        <figure style={{ margin: 0, display: overlay ? 'none' : 'block' }}>
          <figcaption>Kibana</figcaption>
          <img
            src={screenshot}
            alt={`Kibana's drawing of ${comparison.title}`}
            width={width}
            height={height}
          />
        </figure>
        <figure style={{ margin: 0 }}>
          <figcaption>{overlay ? 'Isomer over Kibana' : 'Isomer'}</figcaption>
          <div style={{ position: 'relative', width, height }}>
            {overlay ? (
              <img
                src={screenshot}
                alt=""
                width={width}
                height={height}
                style={{ position: 'absolute', inset: 0 }}
              />
            ) : null}
            {/* A dashboard panel gives its chart a definite size; so does every wrapper down to the drawing. */}
            <style>{'[data-comparison-frame] div{height:100%}'}</style>
            <div
              aria-label="Isomer drawing"
              data-comparison-frame=""
              style={{
                position: 'absolute',
                inset: 0,
                opacity: overlay ? opacity : 1,
              }}>
              {composition && fontsReady ? (
                <Preview
                  key={`${comparison.id}/${theme}`}
                  composition={composition}
                  zoom={1}
                  heading={false}
                  onCommit={onCommit}
                />
              ) : null}
            </div>
          </div>
        </figure>
      </div>

      <section
        aria-label="Comparison"
        data-status={status}
        style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ margin: 0 }}>
          {status === 'pass'
            ? 'Matches Kibana'
            : status === 'missing'
              ? `No captured case is named ${requested}`
              : status === 'fail'
                ? `${failing!.length} differences from Kibana`
                : status === 'refused'
                  ? 'Isomer could not lower this panel'
                  : status === 'error'
                    ? `Kibana's fonts did not load: ${(fonts as Error).message}`
                    : 'Comparing…'}
        </h2>
        {replayed.status !== 'bound' ? (
          <ul role="alert" aria-label="Diagnostics">
            {replayed.diagnostics.map(({ code, message, path: at }, index) => (
              <li key={index}>
                <code>{code}</code> at <code>{at.join('.') || '(root)'}</code>:{' '}
                {message}
              </li>
            ))}
          </ul>
        ) : differences?.length ? (
          <table
            style={{ borderCollapse: 'collapse' }}
            aria-label="Differences">
            <thead>
              <tr>
                {[
                  'Field',
                  'Feature',
                  'Kibana',
                  'Isomer',
                  'Model',
                  'Not failed because',
                ].map((name) => (
                  <th key={name} style={cell}>
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {differences.map(
                ({
                  path: field,
                  feature,
                  reference: expected,
                  actual,
                  gap,
                  uncompared,
                }) => (
                  <tr key={field}>
                    <td style={cell}>
                      <code>{field}</code>
                    </td>
                    <td style={cell}>{feature}</td>
                    <td style={cell}>{pretty(expected)}</td>
                    <td style={cell}>{pretty(actual)}</td>
                    <td style={cell}>{pretty(modelValue(readings, field))}</td>
                    <td style={cell}>{gap?.reason ?? uncompared ?? ''}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        ) : null}
      </section>

      <details>
        <summary>Case</summary>
        <pre style={pre} aria-label="Case JSON">
          {JSON.stringify({ ...comparison, data: '…' }, null, 2)}
        </pre>
      </details>
      {composition ? (
        <details>
          <summary>Composition</summary>
          <pre style={pre} aria-label="Composition JSON">
            {JSON.stringify(composition, null, 2)}
          </pre>
        </details>
      ) : null}
      {drawn ? (
        <details>
          <summary>Isomer's fingerprint</summary>
          <pre style={pre} aria-label="Isomer fingerprint">
            {JSON.stringify(drawn, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
