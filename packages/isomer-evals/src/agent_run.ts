/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toJSONSchema } from 'zod';

import type {
  AgentEvalCall,
  AgentEvalCase,
  AgentEvalCaseResult,
  AgentEvalReport,
  AgentEvalTool,
  AgentMessage,
  AgentToolCall,
  AgentToolResult,
  AgentToolSpec,
  RunAgentEvalsOptions,
} from './agent_types';
import { mapWithConcurrency, mean } from './concurrency';
import { scoreExpectedPrimitives } from './score/expected_primitives';
import { checkComposition, parseGenerated } from './score/validity';

const DEFAULT_SYSTEM =
  'Answer each request with one composition. Use the tools to learn the primitives and check your work. When you are done, reply with only the composition JSON and nothing else.';

const DEFAULT_MAX_TURNS = 12;

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const toolSpec = ({
  name,
  description,
  inputSchema,
}: AgentEvalTool): AgentToolSpec => {
  const { $schema: _dialect, ...parameters } = toJSONSchema(inputSchema);
  return { name, description, parameters };
};

/** Runs one call; an unknown tool, input the schema refuses, or a throwing handler is a failed result the model reads, not an error. */
const callTool = async (
  tools: readonly AgentEvalTool[],
  { id, name, args }: AgentToolCall
): Promise<AgentToolResult> => {
  const tool = tools.find((candidate) => candidate.name === name);
  if (tool === undefined) {
    return { id, name, text: `Unknown tool "${name}".`, isError: true };
  }
  const input = tool.inputSchema.safeParse(args);
  if (!input.success) {
    return { id, name, text: input.error.message, isError: true };
  }
  try {
    const { content, isError = false } = await tool.handler(input.data);
    const text = content
      .map((block) => block.text ?? `[${block.type}]`)
      .join('\n');
    return { id, name, text, isError };
  } catch (error) {
    return { id, name, text: errorText(error), isError: true };
  }
};

/**
 * Scores agents that work through tools, over a corpus.
 *
 * Where `runEvals` hands a model the whole catalog in one prompt, this hands it `tools` and lets it
 * look up what it needs, which is how an agent meets Isomer over MCP. `step` is the only model call.
 */
export const runAgentEvals = async ({
  runtime,
  tools,
  step,
  corpus,
  frame,
  system = DEFAULT_SYSTEM,
  maxTurns = DEFAULT_MAX_TURNS,
  repeat = 1,
  concurrency = 1,
}: RunAgentEvalsOptions): Promise<AgentEvalReport> => {
  const specs = tools.map(toolSpec);
  const knownTypes = new Set(
    runtime.getAuthoringContext().primitives.map(({ type }) => type)
  );

  const runCase = async (
    evalCase: AgentEvalCase,
    run: number
  ): Promise<AgentEvalCaseResult> => {
    const messages: AgentMessage[] = [{ role: 'user', text: evalCase.prompt }];
    const calls: AgentEvalCall[] = [];
    const usage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
    let turns = 0;
    let answer: string | undefined;
    let error: string | undefined;

    while (turns < maxTurns && answer === undefined) {
      let turn;
      try {
        turn = await step({ evalCase, system, tools: specs, messages });
      } catch (thrown) {
        error = errorText(thrown);
        break;
      }
      turns += 1;
      usage.inputTokens += turn.usage?.inputTokens ?? 0;
      usage.outputTokens += turn.usage?.outputTokens ?? 0;
      usage.cachedInputTokens += turn.usage?.cachedInputTokens ?? 0;
      const { text, toolCalls, raw } = turn;
      messages.push({
        role: 'assistant',
        text,
        toolCalls,
        ...(raw === undefined ? {} : { raw }),
      });
      if (toolCalls.length === 0) {
        answer = text;
        break;
      }
      const results: AgentToolResult[] = [];
      for (const toolCall of toolCalls) {
        const result = await callTool(tools, toolCall);
        results.push(result);
        calls.push({
          name: toolCall.name,
          args: toolCall.args,
          isError: result.isError,
          resultBytes: new TextEncoder().encode(result.text).length,
        });
      }
      messages.push({ role: 'tool', results });
    }

    const base = {
      caseId: evalCase.id,
      run,
      finished: answer !== undefined,
      ...(error === undefined ? {} : { error }),
      turns,
      calls,
      toolResultBytes: calls.reduce(
        (sum, { resultBytes }) => sum + resultBytes,
        0
      ),
      usage,
    };
    if (answer === undefined) {
      return {
        ...base,
        parsed: false,
        valid: false,
        errors: [error ?? `no answer within ${maxTurns} turns`],
      };
    }
    const attempt = parseGenerated(answer);
    if (!attempt.parsed) {
      return { ...base, parsed: false, valid: false, errors: [attempt.error] };
    }
    const check = checkComposition(runtime, attempt.value);
    const frameErrors =
      check.composition === undefined
        ? []
        : (frame?.validateBody?.(check.composition.body) ?? []);
    const errors = [...check.errors, ...frameErrors];
    return {
      ...base,
      parsed: true,
      valid: errors.length === 0,
      errors,
      ...(evalCase.expected === undefined
        ? {}
        : {
            expected: scoreExpectedPrimitives(
              attempt.value,
              evalCase.expected,
              knownTypes
            ),
          }),
    };
  };

  const jobs = corpus.flatMap((evalCase) =>
    Array.from({ length: repeat }, (_, run) => ({ evalCase, run }))
  );
  const results = await mapWithConcurrency(
    jobs,
    concurrency,
    ({ evalCase, run }) => runCase(evalCase, run)
  );

  const callsPerRun: Record<string, number> = {};
  for (const { calls } of results) {
    for (const { name } of calls) {
      callsPerRun[name] = (callsPerRun[name] ?? 0) + 1 / results.length;
    }
  }
  const scored = results.filter(({ expected }) => expected !== undefined);
  return {
    results,
    totals: {
      runs: results.length,
      finished: results.filter(({ finished }) => finished).length,
      valid: results.filter(({ valid }) => valid).length,
      expectedHits: scored.filter(({ expected }) => expected?.hit).length,
      expectedRuns: results.filter(
        ({ caseId }) =>
          corpus.find(({ id }) => id === caseId)?.expected !== undefined
      ).length,
      meanTurns: mean(results.map(({ turns }) => turns)),
      meanInputTokens: mean(results.map(({ usage }) => usage.inputTokens)),
      meanOutputTokens: mean(results.map(({ usage }) => usage.outputTokens)),
      meanToolResultBytes: mean(
        results.map(({ toolResultBytes }) => toolResultBytes)
      ),
      callsPerRun,
    },
  };
};
