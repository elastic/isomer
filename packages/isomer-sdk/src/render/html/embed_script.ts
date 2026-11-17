/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Escapes script text for an inline `<script>`, where composition data in an adapter's script could otherwise close the element early.

import {
  type Comment as JavaScriptComment,
  type Node as JavaScriptNode,
  parse,
} from 'acorn';

interface ScriptNode extends JavaScriptNode {
  tag: ScriptNode;
  quasi: ScriptNode;
  quasis: ScriptNode[];
  expressions: ScriptNode[];
  value: { raw: string; cooked: string | null };
  name?: string;
}

// Tagged templates observe raw spelling and reuse the same frozen object per site.
export const embedJs = (js: string): string => {
  if (!/<\/script|<!--/i.test(js)) {
    return js;
  }
  const comments: JavaScriptComment[] = [];
  const tree = parse(js, { ecmaVersion: 'latest', onComment: comments });
  const sites: ScriptNode[] = [];
  const identifiers = new Set<string>();
  const pending: JavaScriptNode[] = [tree];
  while (pending.length) {
    const node = pending.pop()! as ScriptNode;
    if (node.type === 'Identifier' && node.name) {
      identifiers.add(node.name);
    }
    if (
      node.type === 'TaggedTemplateExpression' &&
      node.quasi.quasis.some(({ value: { raw } }) =>
        /<\/script|<!--/i.test(raw)
      )
    ) {
      sites.push(node);
    }
    for (const value of Object.values(node)) {
      for (const child of Array.isArray(value) ? value : [value]) {
        if (
          child &&
          typeof child === 'object' &&
          'type' in child &&
          'start' in child
        ) {
          pending.push(child as JavaScriptNode);
        }
      }
    }
  }
  sites.sort((a, b) => a.start - b.start);
  let prefix = '__isomerTemplate';
  while ([...identifiers].some((name) => name.startsWith(prefix))) {
    prefix += '_';
  }
  const literal = (value: string | null): string =>
    value === null ? 'void 0' : JSON.stringify(value).replace(/</g, '\\u003c');
  const rewrite = (start: number, end: number): string => {
    let cursor = start;
    let result = '';
    const edits = [
      ...sites.map((site, index) => ({
        ...site,
        index,
        comment: undefined as string | undefined,
      })),
      ...comments
        .filter(({ start }) =>
          /^(?:<!--|--!?>)/.test(js.slice(start, start + 4))
        )
        .map((comment) => ({ ...comment, index: -1, comment: comment.value })),
    ].sort((a, b) => a.start - b.start);
    for (const edit of edits) {
      if (edit.start < cursor || edit.end > end) {
        continue;
      }
      result += js.slice(cursor, edit.start);
      if (edit.comment !== undefined) {
        result += `//${edit.comment}`;
      } else {
        const site = sites[edit.index]!;
        const {
          tag,
          quasi: { quasis, expressions },
        } = site;
        const cooked = quasis
          .map(({ value }) => literal(value.cooked))
          .join(',');
        const raw = quasis.map(({ value }) => literal(value.raw)).join(',');
        const cache = `${prefix}${edit.index}`;
        const template = `${cache} ??= ${prefix}Freeze(${prefix}Define([${cooked}], 'raw', {value:${prefix}Freeze([${raw}])}))`;
        const args = expressions.map((expression) =>
          rewrite(expression.start, expression.end)
        );
        result += `(${rewrite(tag.start, tag.end)})(${template}${args.map((arg) => `,(${arg})`).join('')})`;
      }
      cursor = edit.end;
    }
    return result + js.slice(cursor, end);
  };
  const rewritten = rewrite(0, js.length);
  const scoped = sites.length
    ? `(function(){const ${prefix}Freeze=Object.freeze,${prefix}Define=Object.defineProperty;let ${sites.map((_site, index) => `${prefix}${index}`).join(',')};\n${rewritten}\n})();`
    : rewritten;
  return scoped
    .replace(/<\/(?=script)/gi, '<\\/')
    .replace(/<!--/g, (_match, at: number, source: string) =>
      escapedBy(source, at) ? 'x3C!--' : '\\x3C!--'
    );
};

const escapedBy = (source: string, at: number): boolean => {
  let slashes = 0;
  while (source[at - slashes - 1] === '\\') {
    slashes += 1;
  }
  return slashes % 2 === 1;
};
