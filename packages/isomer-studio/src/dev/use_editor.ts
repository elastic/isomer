/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  CheckedValidationResult,
  Composition,
  PrimitiveNode,
} from '@elastic/isomer-sdk';

import { compileCompositionJsx } from '../model/compile_jsx';
import { printCompositionJsx } from '../model/print_jsx';
import { useStudio } from '../studio_context';

export type EditorFormat = 'jsx' | 'json';

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

export interface EditorState {
  format: EditorFormat;
  setFormat: (format: EditorFormat) => void;
  source: string;
  setSource: (source: string) => void;
  nodes: PrimitiveNode[];
  /** Replaces the nodes, as quick edits do, and reprints the source. */
  setNodes: (nodes: PrimitiveNode[]) => void;
  parseError?: string | undefined;
  isParsing: boolean;
  composition: Composition;
  validation: CheckedValidationResult;
}

/**
 * The editable body for one example: its source in either format, parsed nodes, and their
 * validation. Remount the caller to start over from another example.
 */
export const useEditor = (initial: PrimitiveNode): EditorState => {
  const { runtime, shim, schemaFor, compose, transformJsx } = useStudio();
  const print = useCallback(
    (body: readonly PrimitiveNode[], as: EditorFormat) =>
      as === 'jsx'
        ? printCompositionJsx(body, schemaFor)
        : JSON.stringify(body.length === 1 ? body[0] : body, null, 2),
    [schemaFor]
  );

  const [format, setFormatState] = useState<EditorFormat>(
    transformJsx ? 'jsx' : 'json'
  );
  const [nodes, setNodesState] = useState<PrimitiveNode[]>([initial]);
  const [source, setSourceState] = useState(() => print([initial], format));
  const [parseError, setParseError] = useState<string>();
  const [isParsing, setParsing] = useState(false);
  const pending = useRef(0);

  const reset = useCallback(
    (body: PrimitiveNode[], as: EditorFormat) => {
      pending.current += 1;
      setNodesState(body);
      setSourceState(print(body, as));
      setParseError(undefined);
      setParsing(false);
    },
    [print]
  );

  const setFormat = useCallback(
    (next: EditorFormat) => {
      setFormatState(next);
      reset(nodes, next);
    },
    [nodes, reset]
  );

  const setNodes = useCallback(
    (body: PrimitiveNode[]) => reset(body, format),
    [format, reset]
  );

  const setSource = useCallback(
    (next: string) => {
      setSourceState(next);
      setParsing(true);
      const token = ++pending.current;

      const parse = async () => {
        if (token !== pending.current) {
          return;
        }
        try {
          const parsed =
            format === 'jsx' && transformJsx
              ? await compileCompositionJsx(next, shim, transformJsx)
              : parseBodyJson(next);
          compose(parsed);
          if (token === pending.current) {
            setNodesState(parsed);
            setParseError(undefined);
          }
        } catch (error) {
          if (token === pending.current) {
            setParseError(
              error instanceof Error ? error.message : String(error)
            );
          }
        } finally {
          if (token === pending.current) {
            setParsing(false);
          }
        }
      };
      setTimeout(() => void parse(), PARSE_DELAY);
    },
    [compose, format, shim, transformJsx]
  );

  const composition = useMemo(() => compose(nodes), [compose, nodes]);
  const validation = useMemo(
    () => runtime.validate(composition),
    [runtime, composition]
  );

  return {
    format,
    setFormat,
    source,
    setSource,
    nodes,
    setNodes,
    parseError,
    isParsing,
    composition,
    validation,
  };
};
