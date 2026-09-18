/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderTheme } from './named_color';
import type { PrimitiveNode } from './node';

/**
 * The wire format: one typed document that every surface renders from.
 *
 * Crosses process and vendor boundaries, so the JSON shape is the contract and
 * the TypeScript name is not: {@link Composition.type} reads `view`, the
 * discriminator an agent is prompted on.
 */
export interface Composition<TNode extends PrimitiveNode = PrimitiveNode> {
  /** Root marker. Always `view`; see the note on {@link Composition}. */
  type: 'view';
  /**
   * Wire-format version. A literal rather than `number` so an unknown future
   * version cannot parse as valid, and optional with no default because absent
   * already means v1 — writing one in would rewrite stored documents.
   */
  version?: 1;
  title?: string;
  subtitle?: string;
  /** Light/dark preference, not a resolved value; `auto` resolves light. */
  theme?: RenderTheme;
  /** At least one node, which the schema enforces via `.min(1)`. */
  body: TNode[];
  /**
   * Context a host may surface beside the render.
   *
   * Advisory and pass-through throughout: nothing here changes what the body
   * renders to, and the SDK reads none of it. Timestamps are plain strings by
   * convention ISO 8601, which the schema does not enforce — a host that parses
   * one should tolerate anything.
   */
  meta?: {
    /** Origin of the composition itself, e.g. the agent or feature that composed it. */
    source?: string;
    /** When the composition was produced. */
    generatedAt?: string;
    /** Overrides the accessible name a surface derives from `title`. */
    ariaLabel?: string;
    /** Where the underlying data came from, as opposed to who composed it. */
    provenance?: {
      /** Data origin, e.g. an index or dataset name. */
      source?: string;
      /** The query that produced the data, for a host that offers "show me how". */
      query?: string;
      /** Service or connector that answered the query. */
      provider?: string;
    };
    /** How current the data is, for a host that shows an as-of or staleness badge. */
    freshness?: {
      /** When the data was current, which may precede `generatedAt`. */
      asOf?: string;
      /** Asserted by the producer rather than derived, so a host should prefer it to comparing `asOf`. */
      stale?: boolean;
      /** How long `asOf` stays current. Not range-checked. */
      ttlSeconds?: number;
    };
    /**
     * Set when the composition rendered anyway despite losing some data, so a
     * host can mark it incomplete rather than presenting it as whole.
     */
    partialFailure?: {
      degraded?: boolean;
      /** Human-readable cause, safe to show a user. */
      reason?: string;
    };
  };
}
