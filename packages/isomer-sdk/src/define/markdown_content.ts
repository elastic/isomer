/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Brands `md` output. `Symbol.for`: ESM and CJS builds must agree. */
export const markdownContent = Symbol.for('elastic.isomer.markdown_content');

/** Inline Markdown built with `md`. */
export interface MarkdownInline {
  readonly [markdownContent]: 'inline';
}

/** Block Markdown built with `md`. */
export interface MarkdownBlock {
  readonly [markdownContent]: 'block';
}

/** What a `markdown` renderer may return in place of a string. Nested lists flatten. */
export type MarkdownContent = MarkdownBlock | readonly MarkdownContent[];

/** A string is text: escaped wherever it would read as Markdown, line breaks as spaces. */
export type MarkdownInlineInput = string | MarkdownInline;
