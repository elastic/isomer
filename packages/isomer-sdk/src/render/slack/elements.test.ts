/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { SLACK_LIMITS } from './blocks';
import {
  slackActionId,
  slackButtonStyle,
  slackOverflowElement,
  slackPlainText,
  slackSelectOption,
  slackStaticSelect,
  slackUrlButton,
} from './elements';

describe('slackPlainText', () => {
  it('clamps to the option budget by default', () => {
    const text = slackPlainText('x'.repeat(SLACK_LIMITS.optionTextChars + 5));
    expect(text.type).toBe('plain_text');
    expect(text.emoji).toBe(true);
    expect(text.text).toHaveLength(SLACK_LIMITS.optionTextChars);
    expect(slackPlainText('abcdef', 4).text).toBe('abc…');
  });
});

describe('slackActionId', () => {
  it('reduces the seed to a safe alphabet and caps it', () => {
    expect(slackActionId('select', 'a b/c')).toBe('select:a_b_c');
    expect(slackActionId('select', 'x'.repeat(80))).toBe(
      `select:${'x'.repeat(64)}`
    );
    expect(slackActionId('select', '')).toBe('select:x');
  });
});

describe('slackSelectOption', () => {
  it('clamps the value to 75 characters and includes a description only when given', () => {
    const option = slackSelectOption({ label: 'L', value: 'v'.repeat(80) });
    expect(option.value).toHaveLength(75);
    expect(option.description).toBeUndefined();
    expect(
      slackSelectOption({ label: 'L', value: 'v', description: 'd' })
        .description
    ).toEqual({ type: 'plain_text', text: 'd', emoji: true });
  });
});

describe('slackButtonStyle', () => {
  it('maps named colors onto the two Slack styles', () => {
    expect(slackButtonStyle('danger')).toBe('danger');
    expect(slackButtonStyle('risk')).toBe('danger');
    expect(slackButtonStyle('primary')).toBe('primary');
    expect(slackButtonStyle('accent')).toBe('primary');
    expect(slackButtonStyle('success')).toBe('primary');
    expect(slackButtonStyle('neutral')).toBeUndefined();
    expect(slackButtonStyle(undefined)).toBeUndefined();
  });
});

describe('slackUrlButton', () => {
  it('sets the url and style when both are acceptable', () => {
    expect(
      slackUrlButton({ label: 'Go', href: 'https://x.y', color: 'danger' })
    ).toEqual({
      type: 'button',
      text: { type: 'plain_text', text: 'Go', emoji: true },
      url: 'https://x.y',
      style: 'danger',
    });
  });

  it('omits a blocked href and an unmapped color', () => {
    expect(
      slackUrlButton({
        label: 'Go',
        href: 'javascript:alert(1)',
        color: 'neutral',
      })
    ).toEqual({
      type: 'button',
      text: { type: 'plain_text', text: 'Go', emoji: true },
    });
  });
});

describe('slackStaticSelect', () => {
  const options = Array.from(
    { length: SLACK_LIMITS.optionsPerSelect + 3 },
    (_, i) => ({ label: `L${i}`, value: `v${i}` })
  );

  it('clamps options, sets the placeholder, and selects by value', () => {
    const element = slackStaticSelect({
      seed: 's',
      options,
      placeholder: 'Pick',
      selected: 'v1',
    });
    expect(element.action_id).toBe('select:s');
    expect(element.options).toHaveLength(SLACK_LIMITS.optionsPerSelect);
    expect(element.placeholder?.text).toBe('Pick');
    expect(element.initial_option?.value).toBe('v1');
  });

  it('ignores a selection that was clamped away', () => {
    const element = slackStaticSelect({
      seed: 's',
      options,
      selected: `v${SLACK_LIMITS.optionsPerSelect + 1}`,
    });
    expect(element.initial_option).toBeUndefined();
    expect(element.placeholder).toBeUndefined();
  });
});

describe('slackOverflowElement', () => {
  it('numbers items positionally, clamps them, and drops blocked hrefs', () => {
    const items = Array.from(
      { length: SLACK_LIMITS.optionsPerOverflow + 2 },
      (_, i) => ({
        label: `L${i}`,
        href: i === 0 ? 'javascript:alert(1)' : `https://x.y/${i}`,
        ...(i === 1 ? { description: 'd' } : {}),
      })
    );
    const element = slackOverflowElement('menu', items);
    expect(element.action_id).toBe('overflow:menu');
    expect(element.options).toHaveLength(SLACK_LIMITS.optionsPerOverflow);
    expect(element.options[0]).toEqual({
      text: { type: 'plain_text', text: 'L0', emoji: true },
      value: '0',
    });
    expect(element.options[1]).toEqual({
      text: { type: 'plain_text', text: 'L1', emoji: true },
      value: '1',
      url: 'https://x.y/1',
      description: { type: 'plain_text', text: 'd', emoji: true },
    });
  });
});
