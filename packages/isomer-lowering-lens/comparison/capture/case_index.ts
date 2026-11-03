/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { format, resolveConfig } from 'prettier';

import type { ComparisonCase } from '../case';

/** A font face Kibana served, saved in `__fixtures__/fonts/`. */
export interface CapturedFont {
  family: string;
  weight: string;
  file: string;
  unicodeRange?: string;
}

const HEADER = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Written by the capture; do not edit.
`;

/** Writes `__fixtures__/index.ts`, which bundles every case, its screenshot and Kibana's fonts for the Studio. */
export const writeCaseIndex = async (
  directory: string,
  cases: readonly ComparisonCase[],
  fonts: readonly CapturedFont[]
) => {
  // Code-unit order, since `localeCompare` orders by the machine's locale.
  const sorted = [...cases].sort(({ id: a }, { id: b }) =>
    a < b ? -1 : a > b ? 1 : 0
  );
  const imports = [
    ...sorted.flatMap(({ id }, index) => [
      `import case${index} from './${id}/case.json';`,
      `import screenshot${index} from './${id}/reference.png';`,
    ]),
    ...fonts.map(
      ({ file }, index) => `import font${index} from './fonts/${file}';`
    ),
  ];
  const entries = sorted.map(
    (_, index) => `  { data: case${index}, screenshot: screenshot${index} },`
  );
  const faces = fonts.map(
    ({ family, weight, unicodeRange }, index) =>
      `  { family: ${JSON.stringify(family)}, weight: ${JSON.stringify(weight)}, src: font${index}${
        unicodeRange ? `, unicodeRange: ${JSON.stringify(unicodeRange)}` : ''
      } },`
  );
  const file = join(directory, 'index.ts');
  const source = `${HEADER}\n${imports.join('\n')}\n\nexport const CAPTURED: readonly { data: unknown; screenshot: string }[] = [\n${entries.join(
    '\n'
  )}\n];\n\n/** The font faces Kibana drew the references with. */\nexport const FONTS: readonly { family: string; weight: string; src: string; unicodeRange?: string }[] = [\n${faces.join(
    '\n'
  )}\n];\n`;
  writeFileSync(
    file,
    await format(source, { ...(await resolveConfig(file)), filepath: file })
  );
};
