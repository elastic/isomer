/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** @vitest-environment node */

import type { DefaultPackTypes } from '@elastic/isomer-sdk';
import { definePrimitive } from '@elastic/isomer-sdk';
import { transform } from 'esbuild';
import { runInNewContext } from 'vm';
import { z } from 'zod';

import type { JsxTransform } from '../types';

import type { CompiledEvaluator } from './compile_jsx';
import {
  compileCompositionJsx,
  COMPILED_RESULT,
  createShim,
} from './compile_jsx';
import { JSX_TRANSFORM_OPTIONS } from './jsx_transform';

const transformJsx: JsxTransform = async (source) =>
  (await transform(source, JSX_TRANSFORM_OPTIONS)).code;

const evaluate: CompiledEvaluator = (code, scope) => {
  const context: Record<string, unknown> = { ...scope };
  runInNewContext(code, context);
  return context[COMPILED_RESULT];
};

const primitive = (type: string) => {
  const schema = z.object({ type: z.literal(type), label: z.string() });
  return definePrimitive<z.infer<typeof schema>, DefaultPackTypes>({
    type,
    catalog: { type, purpose: '', useWhen: [], avoidWhen: [], example: {} },
    examples: [],
    schema,
    renderers: { react: () => null, text: () => '', markdown: () => [] },
  });
};

describe('compileCompositionJsx', () => {
  it('reads <Fragment> as a primitive named fragment and <> as a React fragment', async () => {
    const shim = createShim([
      primitive('fragment'),
      primitive('isomerStudioH'),
    ]);
    const source = `<Composition>
  <>
    <Fragment label="a" />
    <IsomerStudioH label="b" />
  </>
</Composition>`;

    await expect(
      compileCompositionJsx(source, shim, transformJsx, { evaluate })
    ).resolves.toEqual([
      { type: 'fragment', label: 'a' },
      { type: 'isomerStudioH', label: 'b' },
    ]);
  });

  describe('default evaluator', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('imports the compiled module from an object URL and revokes it', async () => {
      // Node cannot import `blob:` URLs, so the module is served as a `data:` URL instead.
      vi.stubGlobal(
        'Blob',
        class {
          constructor(readonly parts: string[]) {}
        }
      );
      const create = vi
        .spyOn(URL, 'createObjectURL')
        .mockImplementation(
          (blob) =>
            `data:text/javascript,${encodeURIComponent((blob as unknown as { parts: string[] }).parts.join(''))}`
        );
      const revoke = vi
        .spyOn(URL, 'revokeObjectURL')
        .mockImplementation(() => undefined);
      const shim = createShim([primitive('fragment')]);

      await expect(
        compileCompositionJsx(
          '<Composition><Fragment label="a" /></Composition>',
          shim,
          transformJsx
        )
      ).resolves.toEqual([{ type: 'fragment', label: 'a' }]);
      expect(revoke).toHaveBeenCalledWith(create.mock.results[0]?.value);
    });

    it('revokes the object URL when the import fails', async () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue(
        'data:text/javascript,%3D'
      );
      const revoke = vi
        .spyOn(URL, 'revokeObjectURL')
        .mockImplementation(() => undefined);

      await expect(
        compileCompositionJsx('<Composition />', createShim([]), transformJsx)
      ).rejects.toThrow();
      expect(revoke).toHaveBeenCalledWith('data:text/javascript,%3D');
    });
  });
});
