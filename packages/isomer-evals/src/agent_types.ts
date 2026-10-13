/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import type { ZodType } from 'zod';

import type { EvalCase, EvalRuntime } from './types';

/** A tool the agent may call, declared structurally so an `IsomerTool` from `@elastic/isomer-agent-tools` fits. */
export interface AgentEvalTool {
  name: string;
  description: string;
  inputSchema: ZodType;
  handler(input: unknown): Promise<{
    content: readonly { type: string; text?: string }[];
    isError?: boolean;
  }>;
}

/** A tool as the model sees it: `parameters` is its input as JSON Schema. */
export interface AgentToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** One call the model asked for. `id` pairs it with its result; an adapter whose provider has none makes one up. */
export interface AgentToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface AgentToolResult {
  id: string;
  name: string;
  text: string;
  isError: boolean;
}

/** The provider-neutral transcript. `raw` is the adapter's own copy of a turn, such as a provider's signed parts, handed back unchanged. */
export type AgentMessage =
  | { role: 'user'; text: string }
  | {
      role: 'assistant';
      text: string;
      toolCalls: readonly AgentToolCall[];
      raw?: unknown;
    }
  | { role: 'tool'; results: readonly AgentToolResult[] };

/** Tokens the provider billed for one turn, or summed over a run. */
export interface AgentUsage {
  inputTokens: number;
  outputTokens: number;
  /** Input tokens served from the provider's cache, when it reports them. */
  cachedInputTokens?: number;
}

export interface AgentStepRequest {
  evalCase: AgentEvalCase;
  system: string;
  tools: readonly AgentToolSpec[];
  messages: readonly AgentMessage[];
}

/** The model's next turn. No `toolCalls` ends the run, and `text` is its answer. */
export interface AgentStepResult {
  text: string;
  toolCalls: readonly AgentToolCall[];
  usage?: AgentUsage | undefined;
  raw?: unknown;
}

/**
 * One model turn: the caller's provider adapter.
 *
 * Like `Generate`, the only way a model is reached; replay recorded turns and a run is deterministic.
 */
export type AgentStep = (request: AgentStepRequest) => Promise<AgentStepResult>;

/** An {@link EvalCase} with the node types a good answer uses somewhere in its tree. */
export interface AgentEvalCase extends EvalCase {
  /** Any one of these counts as a hit. */
  expected?: readonly string[] | undefined;
}

/** A frame's body rule, as `isomer_validate` applies it; an SDK `Frame` fits. */
export interface AgentEvalFrame {
  validateBody?(body: readonly PrimitiveNode[]): readonly string[];
}

export interface RunAgentEvalsOptions {
  runtime: EvalRuntime;
  tools: readonly AgentEvalTool[];
  step: AgentStep;
  corpus: readonly AgentEvalCase[];
  /** Applied to the final answer after validation, so an answer the tools would refuse scores invalid. */
  frame?: AgentEvalFrame | undefined;
  /** Defaults to asking for one composition, built with the tools, sent back as JSON alone. */
  system?: string | undefined;
  /** Model turns before a run counts as unfinished. Defaults to 12. */
  maxTurns?: number | undefined;
  /** Runs per case, since one sample of a model says little. Defaults to 1. */
  repeat?: number | undefined;
  /** Runs in flight at once. Defaults to 1. */
  concurrency?: number | undefined;
}

export interface AgentEvalCall {
  name: string;
  args: Record<string, unknown>;
  isError: boolean;
  /** UTF-8 bytes of the result text the model read. */
  resultBytes: number;
}

export interface AgentEvalCaseResult {
  caseId: string;
  /** Which of the case's {@link RunAgentEvalsOptions.repeat} runs this is, from 0. */
  run: number;
  /** The model answered without a tool call within `maxTurns`. */
  finished: boolean;
  /** What `step` threw, when it did; the run stops there. */
  error?: string | undefined;
  turns: number;
  calls: readonly AgentEvalCall[];
  toolResultBytes: number;
  /** Summed over turns; zero when `step` reports none. */
  usage: Required<AgentUsage>;
  parsed: boolean;
  valid: boolean;
  /** The answer's parse error, or its validation and frame errors. */
  errors: readonly string[];
  /** Absent when the case has no `expected` or the answer did not parse. */
  expected?: { hit: boolean; used: readonly string[] } | undefined;
}

export interface AgentEvalReport {
  results: readonly AgentEvalCaseResult[];
  totals: {
    runs: number;
    finished: number;
    valid: number;
    /** Runs whose answer used an expected type, over {@link expectedRuns}. */
    expectedHits: number;
    expectedRuns: number;
    meanTurns?: number | undefined;
    meanInputTokens?: number | undefined;
    meanOutputTokens?: number | undefined;
    meanToolResultBytes?: number | undefined;
    /** Mean calls per run, by tool name. */
    callsPerRun: Readonly<Record<string, number>>;
  };
}
