/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type CheckedValidationResult,
  checkInputBudget,
  type Composition,
  compositionToRender,
  CompositionValidationError,
  type InputBudget,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import {
  type AuthoredElement,
  type AuthoredMarkdownOptions,
  type MarkdownContent,
  md,
  parseAuthoredMarkdown,
  renderAuthoredMarkdown,
  serializeMarkdown,
} from '@elastic/isomer-sdk/markdown';
import {
  markdownContentToSlackBlocks,
  renderSlackEnvelope,
  type SlackEnvelopeDispatcher,
  type SlackEnvelopeOptions,
  type SlackEnvelopeResult,
} from '@elastic/isomer-sdk/slack';

/** Authored input and host-owned attachment mappings; mapping failures leave the surrounding document. */
export interface SlackAuthoredMarkdownOptions
  extends AuthoredMarkdownOptions, Omit<SlackEnvelopeOptions, 'heading'> {
  resolveElement: (element: AuthoredElement) => Composition | null | undefined;
  onElementError?: (error: unknown, element: AuthoredElement) => void;
}

export interface AuthoredElementError {
  readonly element: AuthoredElement;
  readonly message: string;
}

export interface SlackAuthoredMarkdownResult extends SlackEnvelopeResult {
  readonly inert: boolean;
  readonly elementErrors: readonly AuthoredElementError[];
}

export const renderSlackAuthoredMarkdown = (
  source: string,
  options: SlackAuthoredMarkdownOptions,
  dispatcher: SlackEnvelopeDispatcher<PrimitiveNode>,
  validate: (composition: Composition) => CheckedValidationResult,
  inputBudget: InputBudget = {}
): SlackAuthoredMarkdownResult => {
  const requireBudget = (value: unknown): unknown => {
    const result = checkInputBudget(value, inputBudget);
    if (!result.valid) {
      throw new CompositionValidationError([result.error]);
    }
    return result.value;
  };
  const input = requireBudget({ source, elements: options.elements }) as {
    source: string;
    elements: string[];
  };
  const document = parseAuthoredMarkdown(input.source, {
    elements: input.elements,
  });
  requireBudget({ source: input.source, elements: document.elements });
  const contentByNode = new WeakMap<
    PrimitiveNode,
    { content: MarkdownContent; text: string }
  >();
  const renderedText: string[] = [];
  const markdownNode = (
    content: MarkdownContent,
    text: string
  ): PrimitiveNode => {
    const node = { type: 'isomerAuthoredMarkdown' };
    contentByNode.set(node, {
      content,
      text,
    });
    renderedText.push(text);
    return node;
  };
  const elementErrors: AuthoredElementError[] = [];
  const attachments: Composition[] = [];
  const body = renderAuthoredMarkdown(document, {
    markdown: (content, text) => [markdownNode(content, text)],
    element: (element): PrimitiveNode[] => {
      let checked: Composition;
      try {
        const composition = options.resolveElement(element);
        if (composition == null) {
          return [];
        }
        checked = compositionToRender(validate(composition), 'throw');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        elementErrors.push({ element, message });
        options.onElementError?.(error, element);
        return [];
      }
      attachments.push(checked);
      requireBudget({
        source: input.source,
        elements: document.elements,
        attachments,
      });
      const heading: MarkdownContent[] = [];
      if (checked.title) {
        heading.push(md.paragraph(md.strong(checked.title)));
      }
      if (checked.subtitle) {
        heading.push(md.paragraph(md.emphasis(checked.subtitle)));
      }
      return [
        ...(heading.length
          ? [
              markdownNode(
                heading,
                [checked.title, checked.subtitle].filter(Boolean).join('\n')
              ),
            ]
          : []),
        ...checked.body,
      ];
    },
  }).flat();
  requireBudget({ renderedText, attachments });
  const wrapped: SlackEnvelopeDispatcher<PrimitiveNode> = {
    renderText: (node) =>
      contentByNode.get(node)?.text ?? dispatcher.renderText(node),
    renderMarkdown: (node) => {
      const value = contentByNode.get(node);
      return value
        ? serializeMarkdown(value.content)
        : dispatcher.renderMarkdown(node);
    },
    renderSlack: (node, collector) => {
      const value = contentByNode.get(node);
      return value
        ? markdownContentToSlackBlocks(value.content)
        : dispatcher.renderSlack(node, collector);
    },
  };
  return {
    ...renderSlackEnvelope({ type: 'view', body }, wrapped, {
      ...options,
      heading: false,
    }),
    inert: document.inert,
    elementErrors,
  };
};
