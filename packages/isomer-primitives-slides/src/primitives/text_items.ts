/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@elastic/isomer-sdk';
import { fromChildren, textFromChildren } from '@elastic/isomer-sdk/author';
import type { ZodType } from 'zod';

/** Brands a string array so each `<childType>` child is one item: its `text` prop, or else its text. */
export const textItems = <const TName extends string, TSchema extends ZodType>(
  childType: TName,
  schema: TSchema
) =>
  fromChildren(childType, schema, {
    propsSchema: z.strictObject({ text: z.string().optional() }),
    toItem: ({ children, text }) => text ?? textFromChildren(children),
  });
