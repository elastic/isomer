/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NamedColor } from '../../composition/named_color';

import {
  SLACK_LIMITS,
  type SlackButtonElement,
  type SlackOptionObject,
  type SlackOverflowElement,
  type SlackPlainTextObject,
  type SlackStaticSelectElement,
} from './blocks';
import { clampSlackText, cutSlackValue, slackLinkUrl } from './format';

/** `plain_text` object with emoji substitution on, clamped to `max`. */
export const slackPlainText = (
  text: string,
  max: number = SLACK_LIMITS.optionTextChars
): SlackPlainTextObject => ({
  type: 'plain_text',
  text: clampSlackText(text, max),
  emoji: true,
});

/**
 * `kind:seed` action id, with `seed` reduced to `[A-Za-z0-9_-]` and capped at
 * 64 characters. Not unique on its own — pass a seed known to be distinct.
 */
export const slackActionId = (kind: string, seed: string): string =>
  `${kind}:${seed.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 64) || 'x'}`;

/** Option for {@link slackSelectOption}; `value` is what interactions send. */
export interface SlackSelectOptionInput {
  label: string;
  /** Cut to Slack's 150 characters with no ellipsis, so a longer value reaches the interaction payload truncated. */
  value: string;
  description?: string | undefined;
}

/** Select/radio/checkbox option, with every field clamped to Slack's budget. */
export const slackSelectOption = (
  input: SlackSelectOptionInput
): SlackOptionObject => {
  const option: SlackOptionObject = {
    text: slackPlainText(input.label),
    value: cutSlackValue(input.value, SLACK_LIMITS.optionValueChars),
  };
  if (input.description) {
    option.description = slackPlainText(
      input.description,
      SLACK_LIMITS.optionTextChars
    );
  }
  return option;
};

/** Item for {@link slackOverflowElement}; `href` goes through {@link slackLinkUrl}. */
export interface SlackOverflowOptionInput {
  label: string;
  /** An `href` {@link slackLinkUrl} rejects leaves the item in the menu with no URL. */
  href: string;
  description?: string;
}

/**
 * A {@link NamedColor} narrowed onto Slack's two button styles. Colors with no
 * Slack equivalent return `undefined`, leaving Slack's default styling.
 */
export const slackButtonStyle = (
  color: NamedColor | undefined
): SlackButtonElement['style'] | undefined =>
  color === 'danger' || color === 'risk'
    ? 'danger'
    : color === 'primary' || color === 'accent' || color === 'success'
      ? 'primary'
      : undefined;

/**
 * Link button. An `href` {@link slackLinkUrl} rejects is omitted rather than
 * blocked in place, so the button renders but does nothing.
 */
export const slackUrlButton = (input: {
  label: string;
  href: string;
  color?: NamedColor;
}): SlackButtonElement => {
  const button: SlackButtonElement = {
    type: 'button',
    text: slackPlainText(input.label),
  };
  const url = slackLinkUrl(input.href);
  if (url) {
    button.url = url;
  }
  const style = slackButtonStyle(input.color);
  if (style) {
    button.style = style;
  }
  return button;
};

/**
 * `static_select` clamped to `SLACK_LIMITS.optionsPerSelect`. `selected`
 * matches on option value, and is ignored if that option was clamped away.
 */
export const slackStaticSelect = (input: {
  seed: string;
  options: ReadonlyArray<SlackSelectOptionInput>;
  placeholder?: string | undefined;
  selected?: string | undefined;
}): SlackStaticSelectElement => {
  const options = input.options
    .slice(0, SLACK_LIMITS.optionsPerSelect)
    .map(slackSelectOption);
  const element: SlackStaticSelectElement = {
    type: 'static_select',
    action_id: slackActionId('select', input.seed),
    options,
  };
  if (input.placeholder) {
    element.placeholder = slackPlainText(input.placeholder);
  }
  const initial = options.find((option) => option.value === input.selected);
  if (initial) {
    element.initial_option = initial;
  }
  return element;
};

/**
 * Overflow menu of link items, clamped to `SLACK_LIMITS.optionsPerOverflow`.
 * Option values are the item index, so an interaction payload identifies the
 * item positionally.
 */
export const slackOverflowElement = (
  seed: string,
  items: readonly SlackOverflowOptionInput[]
): SlackOverflowElement => ({
  type: 'overflow',
  action_id: slackActionId('overflow', seed),
  options: items
    .slice(0, SLACK_LIMITS.optionsPerOverflow)
    .map((item, index) => {
      const option: SlackOptionObject = {
        text: slackPlainText(item.label),
        value: String(index),
      };
      const url = slackLinkUrl(item.href);
      if (url) {
        option.url = url;
      }
      if (item.description) {
        option.description = slackPlainText(item.description);
      }
      return option;
    }),
});
