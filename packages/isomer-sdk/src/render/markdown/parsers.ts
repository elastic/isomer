/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The only module that imports the ESM-only GFM parser and printer. The
// CommonJS build replaces it with one bundled file (`build/bundle_parsers.mjs`),
// since Node loads these packages as about 160 ESM modules otherwise.

export { fromMarkdown } from 'mdast-util-from-markdown';
export { gfmFromMarkdown, gfmToMarkdown } from 'mdast-util-gfm';
export { defaultHandlers, toMarkdown } from 'mdast-util-to-markdown';
export { gfm } from 'micromark-extension-gfm';
