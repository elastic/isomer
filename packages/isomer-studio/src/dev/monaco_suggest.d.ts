/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Monaco ships this suggest model as JavaScript. The completion test filters through it.
// These signatures are internal to Monaco and copied by hand: recheck them when `monaco-editor` is upgraded.

declare module 'monaco-editor/esm/vs/editor/contrib/suggest/browser/completionModel' {
  export class CompletionModel {
    constructor(
      items: readonly object[],
      column: number,
      lineContext: { leadingLineContent: string; characterCountDelta: number },
      wordDistance: { distance: () => number },
      options: { filterGraceful: boolean },
      snippetSuggestions: string
    );
    readonly items: readonly { readonly textLabel: string }[];
  }
}

declare module 'monaco-editor/esm/vs/editor/contrib/suggest/browser/suggest' {
  import type {
    languages,
    Position,
  } from 'monaco-editor/esm/vs/editor/editor.api';

  export class CompletionItem {
    constructor(
      position: Position,
      completion: languages.CompletionItem,
      container: {
        suggestions: readonly languages.CompletionItem[];
        incomplete?: boolean;
      },
      provider: languages.CompletionItemProvider
    );
  }
}
