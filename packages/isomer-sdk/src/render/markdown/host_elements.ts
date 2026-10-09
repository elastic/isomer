/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A micromark extension that reads a host's own tags, such as
// `<render_attachment id="…" />`, as nodes of the tree, so the parser alone
// decides where one is: never in code, a link destination or title, or an
// escape. Its grammar is CommonMark's raw HTML open tag on one line, with
// `_` allowed in the name.

import type {
  CompileContext,
  Extension,
  Token,
} from 'mdast-util-from-markdown';
import type {
  Code,
  Construct,
  Extension as MicromarkExtension,
  State,
  TokenizeContext,
  Tokenizer,
  TokenType,
} from 'micromark-util-types';

export const HOST_ELEMENT_TYPE = 'isomerHostElement';

export interface HostElementNode {
  type: typeof HOST_ELEMENT_TYPE;
  name: string;
  attributes: Record<string, string>;
  /** The tag as written, which an image's alt text reads. */
  value: string;
}

// Custom token types are not in micromark's `TokenTypeMap`.
const INLINE = 'isomerHostElement' as TokenType;
const BLOCK = 'isomerHostElementBlock' as TokenType;
const BLOCK_TAG = 'isomerHostElementBlockTag' as TokenType;

const isSpace = (code: Code): boolean =>
  code === -2 || code === -1 || code === 32;
const isLineEnding = (code: Code): boolean => code !== null && code < -2;
const isNameChar = (code: Code): boolean =>
  code !== null &&
  ((code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 45 ||
    code === 46 ||
    code === 58 ||
    code === 95);
// `"`, `'`, `/`, `<`, `=`, `>`, and backtick.
const NOT_IN_ATTRIBUTE_NAME = new Set([34, 39, 47, 60, 61, 62, 96]);
const NOT_IN_UNQUOTED_VALUE = new Set([34, 39, 60, 61, 62, 96]);
const isAttributeNameChar = (code: Code): boolean =>
  code !== null && code > 32 && !NOT_IN_ATTRIBUTE_NAME.has(code);
const isUnquotedChar = (code: Code): boolean =>
  code !== null && code > 32 && !NOT_IN_UNQUOTED_VALUE.has(code);

const tagTokenizer =
  (names: ReadonlySet<string>, type: TokenType): Tokenizer =>
  (effects, ok, nok) => {
    let name = '';
    let marker: Code = null;

    const close: State = (code) => {
      effects.consume(code);
      effects.exit(type);
      return ok;
    };
    const selfClose: State = (code) => (code === 62 ? close(code) : nok(code));
    const boundary: State = (code) => {
      if (code === 62) {
        return close(code);
      }
      if (code === 47) {
        effects.consume(code);
        return selfClose;
      }
      if (isSpace(code)) {
        effects.consume(code);
        return beforeAttribute;
      }
      return nok(code);
    };
    const quoted: State = (code) => {
      if (code === null || isLineEnding(code)) {
        return nok(code);
      }
      effects.consume(code);
      return code === marker ? boundary : quoted;
    };
    const unquoted: State = (code) => {
      if (isUnquotedChar(code)) {
        effects.consume(code);
        return unquoted;
      }
      return boundary(code);
    };
    const beforeValue: State = (code) => {
      if (isSpace(code)) {
        effects.consume(code);
        return beforeValue;
      }
      if (code === 34 || code === 39) {
        marker = code;
        effects.consume(code);
        return quoted;
      }
      if (isUnquotedChar(code)) {
        effects.consume(code);
        return unquoted;
      }
      return nok(code);
    };
    const afterAttributeName: State = (code) => {
      if (isSpace(code)) {
        effects.consume(code);
        return afterAttributeName;
      }
      if (code === 61) {
        effects.consume(code);
        return beforeValue;
      }
      return beforeAttribute(code);
    };
    const attributeName: State = (code) => {
      if (isAttributeNameChar(code)) {
        effects.consume(code);
        return attributeName;
      }
      return afterAttributeName(code);
    };
    const beforeAttribute: State = (code) => {
      if (isSpace(code)) {
        effects.consume(code);
        return beforeAttribute;
      }
      if (code === 47) {
        effects.consume(code);
        return selfClose;
      }
      if (code === 62) {
        return close(code);
      }
      if (isAttributeNameChar(code)) {
        effects.consume(code);
        return attributeName;
      }
      return nok(code);
    };
    const tagName: State = (code) => {
      if (isNameChar(code)) {
        name += String.fromCharCode(code!).toLowerCase();
        effects.consume(code);
        return tagName;
      }
      return names.has(name) ? boundary(code) : nok(code);
    };
    return (code) => {
      if (code !== 60) {
        return nok(code);
      }
      effects.enter(type);
      effects.consume(code);
      return tagName;
    };
  };

// A tag alone on its line is a block of its own, and interrupts a paragraph,
// as an HTML block that starts with `<div>` does.
const blockTokenizer = (tag: Construct): Tokenizer =>
  function (this: TokenizeContext, effects, ok, nok) {
    const { events } = this;
    const end: State = (code) => {
      if (code === null || isLineEnding(code)) {
        effects.exit(BLOCK);
        return ok(code);
      }
      return nok(code);
    };
    const whitespace: State = (code) => {
      if (isSpace(code)) {
        effects.consume(code);
        return whitespace;
      }
      effects.exit('whitespace');
      return end(code);
    };
    const trailing: State = (code) => {
      if (isSpace(code)) {
        effects.enter('whitespace');
        return whitespace(code);
      }
      return end(code);
    };
    return (code) => {
      const tail = events[events.length - 1];
      if (
        tail?.[1].type === 'linePrefix' &&
        tail[2].sliceSerialize(tail[1], true).length >= 4
      ) {
        return nok(code);
      }
      effects.enter(BLOCK);
      return effects.attempt(tag, trailing, nok)(code);
    };
  };

const ATTRIBUTE_RE =
  /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`=]+)))?/g;

/** A tag's attributes as written, keyed by lower-cased name; the first of a name wins. */
export const parseAttributes = (body: string): Record<string, string> => {
  const attributes = Object.create(null) as Record<string, string>;
  for (const [, key, double, single, bare] of body.matchAll(ATTRIBUTE_RE)) {
    const lower = key!.toLowerCase();
    if (!(lower in attributes)) {
      attributes[lower] = double ?? single ?? bare ?? '';
    }
  }
  return attributes;
};

const parseTag = (
  raw: string,
  canonical: ReadonlyMap<string, string>
): Omit<HostElementNode, 'type'> => {
  const [, name = ''] = /^<([^\s/>]+)/.exec(raw) ?? [];
  return {
    name: canonical.get(name.toLowerCase()) ?? name,
    attributes: parseAttributes(
      raw.slice(1 + name.length).replace(/\/?>$/, '')
    ),
    value: raw,
  };
};

/** Parser extensions that read each of `names` as a {@link HostElementNode}, typed `unknown` so no declaration names micromark or mdast. */
export const hostElementExtensions = (
  names: readonly string[]
): { micromark: unknown; mdast: unknown } => {
  const canonical = new Map(
    [...names].reverse().map((name) => [name.toLowerCase(), name])
  );
  const lower = new Set(canonical.keys());
  const inline: Construct = {
    name: 'isomerHostElement',
    tokenize: tagTokenizer(lower, INLINE),
    add: 'before',
  };
  const block: Construct = {
    name: 'isomerHostElementBlock',
    tokenize: blockTokenizer({ tokenize: tagTokenizer(lower, BLOCK_TAG) }),
    add: 'before',
  };
  const micromark: MicromarkExtension = {
    text: { 60: inline },
    flow: { 60: block },
  };

  const enter = function (this: CompileContext, token: Token) {
    this.enter(
      { type: HOST_ELEMENT_TYPE, name: '', attributes: {}, value: '' } as never,
      token
    );
  };
  const exit = function (this: CompileContext, token: Token) {
    const node = this.stack[
      this.stack.length - 1
    ] as unknown as HostElementNode;
    Object.assign(node, parseTag(this.sliceSerialize(token).trim(), canonical));
    this.exit(token);
  };
  const mdast: Extension = {
    enter: { [INLINE]: enter, [BLOCK]: enter },
    exit: { [INLINE]: exit, [BLOCK]: exit },
  };
  return { micromark, mdast };
};
