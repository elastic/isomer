/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CheckedValidationResult,
  Composition,
  PrimitiveNode,
} from '@elastic/isomer-sdk';
import type {
  PrintCompositionRoot,
  PrintJsxEnv,
} from '@elastic/isomer-sdk/author';
import { printCompositionJsx } from '@elastic/isomer-sdk/author';

import {
  compileCompositionDocumentJsx,
  compileCompositionJsx,
} from '../model/compile_jsx';
import { useStudio } from '../studio_context';

export type EditorFormat = 'jsx' | 'json';

/** `body` edits example nodes the config composes; `composition` edits a whole `Composition`. */
export type EditorScope = 'body' | 'composition';

/** Where a draft starts: nodes (and, for a composition, its root fields), or source to parse. */
export type EditorInitial =
  | { nodes: PrimitiveNode[]; root?: PrintCompositionRoot | undefined }
  | {
      source: string;
      format: EditorFormat;
      /** False holds JSX unevaluated until {@link EditorState.trust}; JSON is data and always parses. */
      trusted?: boolean | undefined;
    };

const PARSE_DELAY = 250;

const isNode = (value: unknown): value is PrimitiveNode =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  'type' in value &&
  typeof value.type === 'string';

/** A JSON node or array of nodes as a composition body. */
export const parseBodyJson = (source: string): PrimitiveNode[] => {
  const value: unknown = JSON.parse(source);
  const nodes: unknown[] = Array.isArray(value) ? value : [value];
  if (!nodes.length || !nodes.every(isNode)) {
    throw new Error(
      'Expected a node, or an array of nodes, each with a string `type`.'
    );
  }
  return nodes.filter(isNode);
};

/** A draft's root fields, which only the `composition` scope prints, and its body. */
export interface Draft {
  root: PrintCompositionRoot;
  nodes: PrimitiveNode[];
}

/** The source a draft prints as in `format`, for `scope`. */
export const printDraft = (
  { root, nodes: body }: Draft,
  format: EditorFormat,
  scope: EditorScope,
  env: PrintJsxEnv
): string => {
  if (format === 'jsx') {
    return printCompositionJsx(body, env, {
      root: scope === 'composition' ? root : undefined,
    });
  }
  if (scope === 'composition') {
    return JSON.stringify({ type: 'view', ...root, body }, null, 2);
  }
  return JSON.stringify(body.length === 1 ? body[0] : body, null, 2);
};

const NO_ROOT: PrintCompositionRoot = {};

/** A composition as a draft. */
export const splitComposition = ({
  type: _view,
  body,
  ...root
}: Omit<Composition, 'body'> & { body: PrimitiveNode[] }): Draft => ({
  root,
  nodes: body,
});

/**
 * A JSON `Composition` as its root fields and body. A bare node or array of nodes reads as a
 * composition with that body, so a body copied from an example pastes in.
 */
/** `value` as a draft, once its `body` is an array of nodes, whichever format it came from. */
const checkedComposition = (value: object): Draft => {
  const { body } = value as { body?: unknown };
  if (!Array.isArray(body) || !body.every(isNode)) {
    throw new Error(
      'Expected `body` to be an array of nodes, each with a string `type`.'
    );
  }
  return splitComposition(value as unknown as Composition);
};

export const parseCompositionJson = (source: string): Draft => {
  const value: unknown = JSON.parse(source);
  if (isNode(value) && value.type === 'view') {
    return checkedComposition(value);
  }
  return { root: NO_ROOT, nodes: parseBodyJson(source) };
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export interface EditorState {
  scope: EditorScope;
  format: EditorFormat;
  setFormat: (format: EditorFormat) => void;
  source: string;
  setSource: (source: string) => void;
  nodes: PrimitiveNode[];
  /** Applies a quick edit to the draft's nodes and reprints the source, unless the draft doesn't parse or compose. */
  editNodes: (edit: (nodes: PrimitiveNode[]) => PrimitiveNode[]) => void;
  parseError?: string | undefined;
  isParsing: boolean;
  /** True while JSX from an untrusted source waits, unevaluated, for {@link EditorState.trust}. */
  isHeld: boolean;
  /** Evaluates held JSX from now on. */
  trust: () => void;
  /** The draft as authored: composed by the config in `body` scope, as written in `composition` scope. */
  composition: Composition;
  validation: CheckedValidationResult;
}

/**
 * The editable source for one draft: its source in either format, parsed nodes, and their
 * validation. Remount the caller to start over from another draft.
 */
export const useEditor = (
  initial: EditorInitial,
  scope: EditorScope = 'body'
): EditorState => {
  const { runtime, shim, schemaFor, compose, transformJsx } = useStudio();
  const print = useCallback(
    (draft: Draft, as: EditorFormat) =>
      printDraft(draft, as, scope, { schemaFor, shim }),
    [schemaFor, scope, shim]
  );

  const [start] = useState(() => {
    if (!('nodes' in initial)) {
      return {
        format: initial.format,
        draft: { root: NO_ROOT, nodes: [] },
        source: initial.source,
        trusted: initial.trusted ?? true,
      };
    }
    const draft = { root: initial.root ?? NO_ROOT, nodes: initial.nodes };
    if (transformJsx) {
      try {
        return {
          format: 'jsx' as const,
          draft,
          source: print(draft, 'jsx'),
          trusted: true,
        };
      } catch {
        // A type JSX can't name opens as JSON instead.
      }
    }
    return {
      format: 'json' as const,
      draft,
      source: print(draft, 'json'),
      trusted: true,
    };
  });
  const [format, setFormatState] = useState<EditorFormat>(start.format);
  const [draft, setDraft] = useState<Draft>(start.draft);
  const [source, setSourceState] = useState(start.source);
  const [parseError, setParseError] = useState<string>();
  const [isParsing, setParsing] = useState(!('nodes' in initial));
  const [trusted, setTrusted] = useState(start.trusted);
  const isHeld = !trusted && format === 'jsx';
  const pending = useRef(0);

  /** Reprints `next` as `as`, or reports why it can't and keeps the source; returns whether it could. */
  const reset = useCallback(
    (next: Draft, as: EditorFormat): boolean => {
      let printed: string;
      try {
        printed = print(next, as);
      } catch (error) {
        setParseError(errorMessage(error));
        setParsing(false);
        return false;
      }
      pending.current += 1;
      setDraft(next);
      setSourceState(printed);
      setParseError(undefined);
      setParsing(false);
      return true;
    },
    [print]
  );

  const parseSource = useCallback(
    async (text: string, as: EditorFormat): Promise<Draft> => {
      if (as === 'jsx' && !transformJsx) {
        throw new Error('The host supplied no JSX transform; use JSON.');
      }
      if (scope === 'composition') {
        return as === 'jsx' && transformJsx
          ? checkedComposition(
              await compileCompositionDocumentJsx(text, shim, transformJsx)
            )
          : parseCompositionJson(text);
      }
      const parsed =
        as === 'jsx' && transformJsx
          ? await compileCompositionJsx(text, shim, transformJsx)
          : parseBodyJson(text);
      compose(parsed);
      return { root: NO_ROOT, nodes: parsed };
    },
    [compose, scope, shim, transformJsx]
  );

  const parse = useCallback(
    async (token: number, text: string, onParsed: (parsed: Draft) => void) => {
      try {
        const parsed = await parseSource(text, format);
        if (token === pending.current) {
          onParsed(parsed);
        }
      } catch (error) {
        if (token === pending.current) {
          setParseError(errorMessage(error));
          setParsing(false);
        }
      }
    },
    [format, parseSource]
  );

  const accept = useCallback((parsed: Draft) => {
    setDraft(parsed);
    setParseError(undefined);
    setParsing(false);
  }, []);

  const parsedOnce = useRef(false);
  useEffect(() => {
    if ('nodes' in initial || isHeld || parsedOnce.current) {
      return;
    }
    parsedOnce.current = true;
    void parse(++pending.current, source, accept);
  }, [accept, initial, isHeld, parse, source]);

  /** Runs `then` on the draft the current source parses to, or reports why it doesn't parse. */
  const withDraft = useCallback(
    (then: (current: Draft) => void) => {
      if (isHeld) {
        return;
      }
      if (!isParsing && !parseError) {
        then(draft);
        return;
      }
      void parse(++pending.current, source, then);
    },
    [draft, isHeld, isParsing, parse, parseError, source]
  );

  const setFormat = useCallback(
    (next: EditorFormat) =>
      withDraft((current) => {
        if (reset(current, next)) {
          setFormatState(next);
        }
      }),
    [reset, withDraft]
  );

  const editNodes = useCallback(
    (edit: (body: PrimitiveNode[]) => PrimitiveNode[]) =>
      withDraft((current) => {
        const next = { ...current, nodes: edit(current.nodes) };
        if (scope === 'body') {
          try {
            compose(next.nodes);
          } catch (error) {
            setParseError(errorMessage(error));
            setParsing(false);
            return;
          }
        }
        reset(next, format);
      }),
    [compose, format, reset, scope, withDraft]
  );

  const setSource = useCallback(
    (next: string) => {
      setSourceState(next);
      if (isHeld) {
        return;
      }
      setParsing(true);
      const token = ++pending.current;

      setTimeout(() => {
        if (token !== pending.current) {
          return;
        }
        void parse(token, next, accept);
      }, PARSE_DELAY);
    },
    [accept, isHeld, parse]
  );

  const trust = useCallback(() => {
    if (trusted) {
      return;
    }
    setTrusted(true);
    setParsing(true);
    parsedOnce.current = true;
    void parse(++pending.current, source, accept);
  }, [accept, parse, source, trusted]);

  const composition = useMemo(
    (): Composition =>
      scope === 'composition'
        ? { type: 'view', ...draft.root, body: draft.nodes }
        : compose(draft.nodes),
    [compose, draft, scope]
  );
  const validation = useMemo(
    () => runtime.validate(composition),
    [runtime, composition]
  );

  return {
    scope,
    format,
    setFormat,
    source,
    setSource,
    nodes: draft.nodes,
    editNodes,
    parseError,
    isParsing: isParsing && !isHeld,
    isHeld,
    trust,
    composition,
    validation,
  };
};
