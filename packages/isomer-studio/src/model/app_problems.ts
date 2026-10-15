/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const APP_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const label = (index: number, id: unknown) =>
  typeof id === 'string' ? `apps[${index}] ("${id}")` : `apps[${index}]`;

/** What is wrong with a config's `apps`, one line per problem, each naming the app. Runs in Node and the browser. */
export const appProblems = (apps: unknown): string[] => {
  if (apps === undefined) {
    return [];
  }
  if (!Array.isArray(apps)) {
    return ['apps must be an array.'];
  }
  const problems: string[] = [];
  const seen = new Set<string>();
  apps.forEach((app: unknown, index) => {
    if (!isRecord(app)) {
      problems.push(`apps[${index}] must be an object.`);
      return;
    }
    const { id, title, icon, load } = app;
    const name = label(index, id);
    if (typeof id !== 'string' || !APP_ID_PATTERN.test(id)) {
      problems.push(`${name}: id must match ${APP_ID_PATTERN.source}.`);
    } else if (seen.has(id)) {
      problems.push(`${name}: id is used by an earlier app.`);
    } else {
      seen.add(id);
    }
    if (typeof title !== 'string' || !title.trim()) {
      problems.push(`${name}: title must be a non-empty string.`);
    }
    if (typeof load !== 'function') {
      problems.push(`${name}: load must be a function.`);
    }
    if (
      icon !== undefined &&
      !(isRecord(icon) && typeof icon.svg === 'string')
    ) {
      problems.push(`${name}: icon must be { svg: string }.`);
    }
  });
  return problems;
};
