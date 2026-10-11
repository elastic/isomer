/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from 'htmlparser2';
import type { Extension as MdastExtension } from 'mdast-util-from-markdown';
import type { Construct, Extension, State, Token } from 'micromark-util-types';

import type { AuthoredElement } from './authored';

export interface HostElementNode extends AuthoredElement {
  type: 'isomerHostElement';
  value: string;
}

/** Marker grammar needs no nesting or closing-tag stack. */
class MarkerParser extends Parser {
  override isVoidElement = (_name: string): boolean => true;
}

export const createHostElementParser = (
  names: readonly string[],
  onElement: (element: AuthoredElement, start: number, end: number) => void,
  onReject: () => void = () => undefined
): Parser => {
  const allowed = new Map(names.map((name) => [name.toLowerCase(), name]));
  let attributes = Object.create(null) as Record<string, string>;
  const parser = new MarkerParser(
    {
      onopentagname: (name) => {
        attributes = Object.create(null) as Record<string, string>;
        if (!allowed.has(name)) {
          onReject();
        }
      },
      onattribute: (name, value) => {
        if (!Object.hasOwn(attributes, name)) {
          attributes[name] = value;
        }
      },
      onopentag: (name, _attributes, implied) => {
        const configured = allowed.get(name);
        if (!implied && configured !== undefined) {
          onElement(
            Object.freeze({
              name: configured,
              attributes: Object.freeze(attributes),
            }),
            parser.startIndex,
            parser.endIndex + 1
          );
        }
      },
      ontext: onReject,
      onclosetag: onReject,
    },
    {
      decodeEntities: false,
      lowerCaseTags: true,
      lowerCaseAttributeNames: true,
      xmlMode: true,
    }
  );
  return parser;
};

const lineEnding = (code: number | null): boolean =>
  code === null || code === -3 || code === -4 || code === -5;

export const hostElements = (
  names: readonly string[],
  sourceLength: number
): { syntax: Extension; mdast: MdastExtension } => {
  const elements = new WeakMap<Token, AuthoredElement>();
  let work = sourceLength * 4;
  const construct = (flow: boolean): Construct => ({
    name: 'isomerHostElement',
    tokenize(effects, ok, nok) {
      let token: Token;
      let finished = false;
      let declined = false;
      const parser = createHostElementParser(
        names,
        (element) => {
          elements.set(token, element);
          finished = true;
        },
        () => {
          if (!finished) {
            declined = true;
          }
        }
      );
      const after: State = (code) => {
        if (flow && (code === 32 || code === -2 || code === -1)) {
          effects.consume(code);
          return after;
        }
        if (flow && !lineEnding(code)) {
          return nok(code);
        }
        effects.exit('isomerHostElement' as Token['type']);
        return ok(code);
      };
      const run: State = (code) => {
        if (declined) {
          return nok(code);
        }
        if (finished) {
          return after(code);
        }
        if (lineEnding(code)) {
          return nok(code);
        }
        if (--work < 0) {
          throw new RangeError('Host element scan budget');
        }
        effects.consume(code);
        if (code !== -1) {
          parser.write(code === -2 ? '\t' : String.fromCharCode(code!));
        }
        return run;
      };
      return (code) => {
        token = effects.enter('isomerHostElement' as Token['type']);
        return run(code);
      };
    },
  });
  return {
    syntax: { text: { 60: construct(false) }, flow: { 60: construct(true) } },
    mdast: {
      enter: {
        isomerHostElement(token) {
          this.enter(
            {
              type: 'isomerHostElement',
              ...elements.get(token),
              value: this.sliceSerialize(token).trimEnd(),
            } as unknown as Parameters<typeof this.enter>[0],
            token
          );
        },
      },
      exit: {
        isomerHostElement(token) {
          this.exit(token);
        },
      },
    },
  };
};
