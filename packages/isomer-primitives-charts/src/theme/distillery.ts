/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties } from 'react';
import {
  createDistillery,
  type LocalVarGroup,
  type StylesObject,
} from '@elastic/distillate';

// Guarded so the pack loads as unbundled browser ESM, where `process` is absent.
const dev =
  typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

/**
 * The one distillery every charts style module is authored in. Its modules
 * interpolate `CHARTS_THEME` values, so it declares no theme variables, and
 * each module's name starts with `charts` so no class collides with another
 * library's on the page.
 */
export const chartsDistillery = createDistillery({
  dev,
  prefix: 'charts',
  themeScope: ':root',
  theme: {},
});

type Authoring = Parameters<
  Parameters<typeof chartsDistillery.createStyleModule>[1]
>[0];

/**
 * Authors a charts style module whose rules read module-local `vars`, and
 * returns the var groups beside its handles, and `stylesheet()`, the module's
 * own rules. A rule declares each var's default with `${group}`; a renderer
 * writes a value only a Scene knows, such as a series color or a box's size,
 * with {@link varStyle}.
 */
export const createVarsModule = <TVars, TStyles extends StylesObject>(
  name: string,
  vars: (define: Authoring['vars']) => TVars,
  styles: (api: Authoring, vars: TVars) => TStyles
) => {
  let groups: TVars | undefined;
  const module = chartsDistillery.createStyleModule(name, (api) => {
    groups = vars(api.vars);
    return styles(api, groups);
  });
  return {
    handles: module.handles,
    vars: groups as TVars,
    /** Every rule this module draws with, variants included, whatever else is loaded. */
    stylesheet: (): string => {
      const collector = chartsDistillery.artifactCollector('readable');
      collector.useAllEntries(module);
      return chartsDistillery.renderStyles(collector);
    },
  };
};

/**
 * Sets a module's vars on one element: the `style` it returns holds custom
 * properties alone, each declared by the module, so every declaration stays
 * in the stylesheet. Absent values keep the module's default.
 */
export const varStyle = <TKey extends string>(
  group: LocalVarGroup<TKey>,
  values: Partial<Record<TKey, string | undefined>>
): CSSProperties =>
  Object.fromEntries(
    (Object.entries(values) as [TKey, string | undefined][]).flatMap(
      ([key, value]) =>
        value === undefined ? [] : [[group[key].propName, value]]
    )
  );
