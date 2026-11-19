/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SceneBase,
  SceneColor,
  SceneSelection,
  SceneSource,
} from '../../scene/base';

/** One word of a {@link TagCloudScene}: a row. */
export interface TagCloudWord {
  /** The `tags` cell as displayed. */
  readonly text: string;
  /** Its place from the smallest value (0) to the largest (1), which sizes it along the Scene's `scale`. */
  readonly weight: number;
  readonly value: number | null;
  /** `value` as displayed. */
  readonly valueText: string;
  readonly color: SceneColor;
  readonly source: SceneSource;
  /** What a selection of the word describes, such as "host.name: web-01 · Count: 12". */
  readonly description: string;
  /** The `tag` selection, when the node offers it. */
  readonly selection?: SceneSelection;
}

/** A Scene of words sized by value. */
export interface TagCloudScene extends SceneBase {
  readonly kind: 'tagCloud';
  /** In row order. */
  readonly words: readonly TagCloudWord[];
  /** How a word's `weight` becomes its font size between `fontSize.min` and `fontSize.max`. */
  readonly scale: 'linear' | 'log' | 'squareRoot';
  /**
   * The angles words may take, in degrees: `count` evenly spaced from `start`
   * to `end`, each word's chosen from its text, as Elastic Charts' word cloud
   * chooses it.
   */
  readonly angles: {
    readonly start: number;
    readonly end: number;
    readonly count: number;
  };
  readonly fontSize: { readonly min: number; readonly max: number };
  /** Written under the cloud, when the node shows it. */
  readonly label?: string;
  /** Present when there is nothing to draw: the reason, and the text to draw instead. */
  readonly empty?: { readonly reason: 'noResults'; readonly text: string };
}
