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
const NAME = 'isomerHostElementName' as TokenType;
const ATTRIBUTE_NAME = 'isomerHostElementAttributeName' as TokenType;
const ATTRIBUTE_VALUE = 'isomerHostElementAttributeValue' as TokenType;
const MARKER = 'isomerHostElementMarker' as TokenType;

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

    // Once a child token has closed, every character needs a token of its own.
    const token =
      (tokenType: TokenType, next: State): State =>
      (code) => {
        effects.enter(tokenType);
        effects.consume(code);
        return (after) => {
          effects.exit(tokenType);
          return next(after);
        };
      };
    const spaces = (next: State): State => {
      const run: State = (code) => {
        if (isSpace(code)) {
          effects.consume(code);
          return run;
        }
        effects.exit('whitespace');
        return next(code);
      };
      return (code) => {
        effects.enter('whitespace');
        effects.consume(code);
        return run;
      };
    };

    const done: State = (code) => {
      effects.exit(type);
      return ok(code);
    };
    const selfClose: State = (code) =>
      code === 62 ? token(MARKER, done)(code) : nok(code);
    const boundary: State = (code) => {
      if (code === 62) {
        return token(MARKER, done)(code);
      }
      if (code === 47) {
        return token(MARKER, selfClose)(code);
      }
      return isSpace(code) ? spaces(beforeAttribute)(code) : nok(code);
    };
    const quoted: State = (code) => {
      if (code === null || isLineEnding(code)) {
        return nok(code);
      }
      if (code === marker) {
        effects.exit(ATTRIBUTE_VALUE);
        return token(MARKER, boundary)(code);
      }
      effects.consume(code);
      return quoted;
    };
    const quotedStart: State = (code) => {
      if (code === marker) {
        return token(MARKER, boundary)(code);
      }
      if (code === null || isLineEnding(code)) {
        return nok(code);
      }
      effects.enter(ATTRIBUTE_VALUE);
      effects.consume(code);
      return quoted;
    };
    const unquoted: State = (code) => {
      if (isUnquotedChar(code)) {
        effects.consume(code);
        return unquoted;
      }
      effects.exit(ATTRIBUTE_VALUE);
      return boundary(code);
    };
    const beforeValue: State = (code) => {
      if (isSpace(code)) {
        return spaces(beforeValue)(code);
      }
      if (code === 34 || code === 39) {
        marker = code;
        return token(MARKER, quotedStart)(code);
      }
      if (isUnquotedChar(code)) {
        effects.enter(ATTRIBUTE_VALUE);
        effects.consume(code);
        return unquoted;
      }
      return nok(code);
    };
    const afterAttributeName: State = (code) => {
      if (isSpace(code)) {
        return spaces(afterAttributeName)(code);
      }
      return code === 61
        ? token(MARKER, beforeValue)(code)
        : beforeAttribute(code);
    };
    const attributeName: State = (code) => {
      if (isAttributeNameChar(code)) {
        effects.consume(code);
        return attributeName;
      }
      effects.exit(ATTRIBUTE_NAME);
      return afterAttributeName(code);
    };
    const beforeAttribute: State = (code) => {
      if (isSpace(code)) {
        return spaces(beforeAttribute)(code);
      }
      if (code === 47) {
        return token(MARKER, selfClose)(code);
      }
      if (code === 62) {
        return token(MARKER, done)(code);
      }
      if (isAttributeNameChar(code)) {
        effects.enter(ATTRIBUTE_NAME);
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
      effects.exit(NAME);
      return names.has(name) ? boundary(code) : nok(code);
    };
    const open: State = (code) => {
      effects.exit(MARKER);
      if (!isNameChar(code)) {
        return nok(code);
      }
      effects.enter(NAME);
      return tagName(code);
    };
    return (code) => {
      if (code !== 60) {
        return nok(code);
      }
      effects.enter(type);
      effects.enter(MARKER);
      effects.consume(code);
      return open;
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

  // Parsing is synchronous, so one tag's attributes are read at a time.
  let pending: string | undefined;
  const current = (context: CompileContext) =>
    context.stack[context.stack.length - 1] as unknown as HostElementNode;
  const enter = function (this: CompileContext, token: Token) {
    pending = undefined;
    this.enter(
      {
        type: HOST_ELEMENT_TYPE,
        name: '',
        attributes: Object.create(null) as Record<string, string>,
        value: '',
      } as never,
      token
    );
  };
  const exit = function (this: CompileContext, token: Token) {
    current(this).value = this.sliceSerialize(token).trim();
    this.exit(token);
  };
  const mdast: Extension = {
    enter: { [INLINE]: enter, [BLOCK]: enter },
    exit: {
      [INLINE]: exit,
      [BLOCK]: exit,
      [NAME]: function (this: CompileContext, token: Token) {
        const name = this.sliceSerialize(token);
        current(this).name = canonical.get(name.toLowerCase()) ?? name;
      },
      [ATTRIBUTE_NAME]: function (this: CompileContext, token: Token) {
        const { attributes } = current(this);
        const key = this.sliceSerialize(token).toLowerCase();
        pending = key in attributes ? undefined : key;
        if (pending !== undefined) {
          attributes[pending] = '';
        }
      },
      [ATTRIBUTE_VALUE]: function (this: CompileContext, token: Token) {
        if (pending !== undefined) {
          current(this).attributes[pending] = this.sliceSerialize(token);
        }
      },
    },
  };
  return { micromark, mdast };
};
