/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ValueFormat,
  valueFormatSchema,
} from '@elastic/isomer-primitives-charts/model';

import { isJsonObject as isRecord } from '../json';

type Mapped =
  | { ok: true; format: ValueFormat | undefined }
  | { ok: false; id: string; outOfRange?: true };

const mapFormat = (params: unknown): Mapped => {
  const format = isRecord(params) ? params.format : undefined;
  if (!isRecord(format)) {
    return { ok: true, format: undefined };
  }
  const { id } = format;
  const options = isRecord(format.params) ? format.params : {};
  const decimals =
    typeof options.decimals === 'number' ? options.decimals : undefined;
  const compact = options.compact === true ? true : undefined;
  const suffix =
    typeof options.suffix === 'string' && options.suffix !== ''
      ? options.suffix
      : undefined;
  const common = {
    ...(decimals === undefined ? {} : { decimals }),
    ...(suffix === undefined ? {} : { suffix }),
  };
  switch (id) {
    case 'number':
    case 'percent':
      return {
        ok: true,
        format: { kind: id, ...common, ...(compact ? { compact } : {}) },
      };
    case 'bytes':
    case 'bits':
      return { ok: true, format: { kind: id, ...common } };
    default:
      return {
        ok: false,
        id: typeof id === 'string' ? id : JSON.stringify(id),
      };
  }
};

/**
 * Maps a Lens column's `params.format` to a {@link ValueFormat}, as
 * `lens_format_column` and `supportedFormats` build it. No format leaves the
 * host's default number pattern, which the resolver's default reproduces.
 */
export const toValueFormat = (params: unknown): Mapped => {
  const mapped = mapFormat(params);
  return mapped.ok &&
    mapped.format &&
    !valueFormatSchema.safeParse(mapped.format).success
    ? { ok: false, id: mapped.format.kind, outOfRange: true }
    : mapped;
};
