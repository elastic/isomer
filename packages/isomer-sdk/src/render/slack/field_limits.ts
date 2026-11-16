/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SLACK_LIMITS,
  type SlackActionsBlock,
  type SlackButtonElement,
  type SlackCheckboxesElement,
  type SlackContainerBlock,
  type SlackContextBlock,
  type SlackHeaderBlock,
  type SlackImageBlock,
  type SlackImageElement,
  type SlackMultiStaticSelectElement,
  type SlackOptionGroup,
  type SlackOptionObject,
  type SlackOverflowElement,
  type SlackRadioButtonsElement,
  type SlackSectionBlock,
  type SlackStaticSelectElement,
  type SlackTableBlock,
  type SlackTextObject,
  type SlackVideoBlock,
} from './blocks';
import { clampMrkdwn, clampSlackText, cutSlackValue } from './format';

type SlackLimitKey = keyof typeof SLACK_LIMITS;

/**
 * How the envelope fits a field past its limit: `clamp` cuts display text and ends it in `…`, `cut` cuts an opaque value a host reads back, `drop` removes a URL, since a cut one points elsewhere.
 * `degrade` leaves the field to its owner, which replaces itself: an image becomes its alt text.
 */
type SlackFit = 'clamp' | 'cut' | 'drop' | 'degrade';

interface SlackCharLimit {
  readonly limit: SlackLimitKey;
  readonly fit: SlackFit;
}

type SlackTextValue = string | SlackTextObject;

// Keys holding text, or a list holding text objects among other entries.
type CharKey<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends SlackTextValue
    ? K
    : NonNullable<T[K]> extends ReadonlyArray<infer E>
      ? [Extract<E, SlackTextObject>] extends [never]
        ? never
        : K
      : never;
}[keyof T];

type CountKey<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends readonly unknown[] ? K : never;
}[keyof T];

/** A limit per field of `T`: `chars` on its text (each text entry of a list), `counts` on its lists. */
interface SlackFieldLimits<T> {
  readonly chars?: { readonly [K in CharKey<T>]?: SlackCharLimit };
  readonly counts?: { readonly [K in CountKey<T>]?: SlackLimitKey };
}

const fit =
  (how: SlackFit) =>
  <const TLimit extends SlackLimitKey>(limit: TLimit) =>
    ({ limit, fit: how }) as const;
const clamp = fit('clamp');
const cut = fit('cut');
const drop = fit('drop');
const degrade = fit('degrade');

const actionId = cut('actionIdChars');
const placeholder = clamp('placeholderChars');
const imageUrl = degrade('imageUrlChars');
const altText = clamp('imageAltTextChars');

/** Each Slack object's field limits, which the envelope fits and `slackLimitProblems` checks. */
export const SLACK_FIELD_LIMITS = {
  header: { chars: { text: clamp('headerTextChars') } },
  section: {
    chars: {
      text: clamp('sectionTextChars'),
      fields: clamp('sectionFieldChars'),
    },
    counts: { fields: 'fieldsPerSection' },
  },
  context: {
    chars: { elements: clamp('contextElementChars') },
    counts: { elements: 'contextElements' },
  },
  actions: { counts: { elements: 'buttonsPerActions' } },
  image: {
    chars: {
      image_url: imageUrl,
      alt_text: altText,
      title: clamp('imageTitleChars'),
    },
  },
  imageElement: { chars: { image_url: imageUrl, alt_text: altText } },
  video: {
    chars: {
      title: clamp('videoTitleChars'),
      description: clamp('videoDescriptionChars'),
      author_name: clamp('videoAuthorNameChars'),
    },
  },
  container: {
    chars: {
      title: clamp('containerTitleChars'),
      subtitle: clamp('containerSubtitleChars'),
    },
    counts: { child_blocks: 'containerChildBlocks' },
  },
  table: { counts: { rows: 'tableRows' } },
  button: {
    chars: {
      action_id: actionId,
      text: clamp('buttonTextChars'),
      value: cut('buttonValueChars'),
      url: drop('urlChars'),
    },
  },
  overflow: {
    chars: { action_id: actionId },
    counts: { options: 'optionsPerOverflow' },
  },
  radio_buttons: {
    chars: { action_id: actionId },
    counts: { options: 'optionsPerChoice' },
  },
  checkboxes: {
    chars: { action_id: actionId },
    counts: { options: 'optionsPerChoice' },
  },
  static_select: {
    chars: { action_id: actionId, placeholder },
    counts: {
      options: 'optionsPerSelect',
      option_groups: 'optionGroupsPerSelect',
    },
  },
  multi_static_select: {
    chars: { action_id: actionId, placeholder },
    counts: {
      options: 'optionsPerSelect',
      option_groups: 'optionGroupsPerSelect',
    },
  },
  option: {
    chars: {
      text: clamp('optionTextChars'),
      value: cut('optionValueChars'),
      description: clamp('optionTextChars'),
      url: drop('urlChars'),
    },
  },
  optionGroup: {
    chars: { label: clamp('optionGroupLabelChars') },
    counts: { options: 'optionsPerSelect' },
  },
} as const satisfies {
  header: SlackFieldLimits<SlackHeaderBlock>;
  section: SlackFieldLimits<SlackSectionBlock>;
  context: SlackFieldLimits<SlackContextBlock>;
  actions: SlackFieldLimits<SlackActionsBlock>;
  image: SlackFieldLimits<SlackImageBlock>;
  imageElement: SlackFieldLimits<SlackImageElement>;
  video: SlackFieldLimits<SlackVideoBlock>;
  container: SlackFieldLimits<SlackContainerBlock>;
  table: SlackFieldLimits<SlackTableBlock>;
  button: SlackFieldLimits<SlackButtonElement>;
  overflow: SlackFieldLimits<SlackOverflowElement>;
  radio_buttons: SlackFieldLimits<SlackRadioButtonsElement>;
  checkboxes: SlackFieldLimits<SlackCheckboxesElement>;
  static_select: SlackFieldLimits<SlackStaticSelectElement>;
  multi_static_select: SlackFieldLimits<SlackMultiStaticSelectElement>;
  option: SlackFieldLimits<SlackOptionObject>;
  optionGroup: SlackFieldLimits<SlackOptionGroup>;
};

/** The `sectionTextChars` budget of each top-level element of a `rich_text` block, measured by `richTextElementText`; a longer one splits. */
export const RICH_TEXT_ELEMENT_LIMIT: SlackLimitKey = 'sectionTextChars';

const isTextObject = (value: unknown): value is SlackTextObject =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  (value.type === 'plain_text' || value.type === 'mrkdwn');

// The checker reads unvalidated payloads, so a text object may lack its text.
const textOf = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  return isTextObject(value) && typeof value.text === 'string'
    ? value.text
    : undefined;
};

/** Whether `value` is within `limit`; anything that is not text is. */
export const withinCharLimit = (
  value: unknown,
  { limit }: SlackCharLimit
): boolean => (textOf(value)?.length ?? 0) <= SLACK_LIMITS[limit];

const fitText = (
  value: SlackTextValue,
  { limit, fit: how }: SlackCharLimit
): SlackTextValue | undefined => {
  const max = SLACK_LIMITS[limit];
  if (withinCharLimit(value, { limit, fit: how }) || how === 'degrade') {
    return value;
  }
  if (how === 'drop') {
    return undefined;
  }
  if (typeof value === 'string') {
    return how === 'cut'
      ? cutSlackValue(value, max)
      : clampSlackText(value, max);
  }
  return {
    ...value,
    text: (value.type === 'mrkdwn' ? clampMrkdwn : clampSlackText)(
      value.text,
      max
    ),
  };
};

const charEntries = <T>({
  chars = {},
}: SlackFieldLimits<T>): Array<[string, SlackCharLimit]> =>
  Object.entries<SlackCharLimit | undefined>(chars).flatMap(([key, limit]) =>
    limit ? [[key, limit]] : []
  );

/** `owner` with each field `limits` names fitted to its `chars` limit, a list's text entries one by one. Counts are the caller's, which splits or slices by owner. */
export const fitFields = <T extends object>(
  owner: T,
  limits: SlackFieldLimits<T>
): T => {
  // Each field keeps its type: text fits to text of its kind, or is removed.
  const fitted = { ...owner } as Record<string, unknown>;
  for (const [key, limit] of charEntries(limits)) {
    const value = fitted[key];
    if (Array.isArray(value)) {
      fitted[key] = value.map((entry: unknown) =>
        isTextObject(entry) ? fitText(entry, limit) : entry
      );
    } else if (typeof value === 'string' || isTextObject(value)) {
      const text = fitText(value, limit);
      if (text === undefined) {
        delete fitted[key];
      } else {
        fitted[key] = text;
      }
    }
  }
  return fitted as T;
};

const overLength = (where: string, text: string | undefined, limit: number) =>
  text !== undefined && text.length > limit
    ? [`${where} has ${text.length} characters; Slack allows ${limit}.`]
    : [];

/** `${where} has ${count}; Slack allows ${limit}.` when `count` is past `limit`. */
export const overCount = (
  where: string,
  count: number,
  limit: number
): string[] =>
  count > limit ? [`${where} has ${count}; Slack allows ${limit}.`] : [];

/** `${where} has N characters; Slack allows L.` when `value`'s text is past `limit`. */
export const overCharLimit = (
  where: string,
  value: unknown,
  limit: number
): string[] => overLength(where, textOf(value), limit);

/** Where `owner` breaks `limits`, one message per field: each text field, each text entry of a list, then each list's count. */
export const fieldLimitProblems = <T extends object>(
  where: string,
  owner: T,
  limits: SlackFieldLimits<T>
): string[] => {
  const fields = { ...owner } as Record<string, unknown>;
  return [
    ...charEntries(limits).flatMap(([key, { limit }]) => {
      const value = fields[key];
      return Array.isArray(value)
        ? value.flatMap((entry: unknown, index) =>
            isTextObject(entry)
              ? overCharLimit(
                  `${where} ${key}[${index}]`,
                  entry,
                  SLACK_LIMITS[limit]
                )
              : []
          )
        : overCharLimit(`${where} ${key}`, value, SLACK_LIMITS[limit]);
    }),
    ...Object.entries<SlackLimitKey | undefined>(limits.counts ?? {}).flatMap(
      ([key, limit]) => {
        const value = fields[key];
        return limit && Array.isArray(value)
          ? overCount(`${where} ${key}`, value.length, SLACK_LIMITS[limit])
          : [];
      }
    ),
  ];
};
