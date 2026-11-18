/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SLACK_LIMITS,
  type SlackActionElement,
  type SlackBlock,
  type SlackButtonElement,
  type SlackContainerBlock,
  type SlackImageElement,
  type SlackMultiStaticSelectElement,
  type SlackOptionObject,
  type SlackStaticSelectElement,
} from './blocks';
import { containerWithChildren } from './container';
import { contextBlock } from './context_block';
import { fitFields, SLACK_FIELD_LIMITS, withinCharLimit } from './field_limits';
import { escapeMrkdwn } from './format';
import { splitRichTextElement } from './rich_text';
import { isUnmodeledSlackBlock } from './unmodeled';

const fitsImageUrl = (image: { image_url?: string }): boolean =>
  withinCharLimit(image.image_url, SLACK_FIELD_LIMITS.image.chars.image_url);

const fitImageElement = (image: SlackImageElement): SlackImageElement =>
  fitFields(image, SLACK_FIELD_LIMITS.imageElement);

const fitOption = (option: SlackOptionObject): SlackOptionObject =>
  fitFields(option, SLACK_FIELD_LIMITS.option);

const isSelect = (
  element: SlackActionElement
): element is SlackStaticSelectElement | SlackMultiStaticSelectElement =>
  element.type === 'static_select' || element.type === 'multi_static_select';

const fitControl = (element: SlackActionElement): SlackActionElement => {
  if (element.type === 'button') {
    return fitFields(element, SLACK_FIELD_LIMITS.button);
  }
  const menu = fitMenuFields(element);
  const maxOptions = SLACK_LIMITS[SLACK_FIELD_LIMITS[menu.type].counts.options];
  if (menu.options) {
    menu.options = menu.options.slice(0, maxOptions).map(fitOption);
  }
  if (isSelect(menu) && menu.option_groups) {
    const { optionGroup } = SLACK_FIELD_LIMITS;
    menu.option_groups = menu.option_groups
      .slice(
        0,
        SLACK_LIMITS[SLACK_FIELD_LIMITS[menu.type].counts.option_groups]
      )
      .map((group) => {
        const fitted = fitFields(group, optionGroup);
        return {
          ...fitted,
          options: fitted.options
            .slice(0, SLACK_LIMITS[optionGroup.counts.options])
            .map(fitOption),
        };
      });
  }
  // Slack requires an initial option to equal one it emits, so each is
  // replaced by the emitted option of the same value, or dropped.
  const emitted = new Map(
    [
      ...(menu.options ?? []),
      ...((isSelect(menu) && menu.option_groups) || []).flatMap(
        ({ options }) => options
      ),
    ].map((option) => [option.value, option])
  );
  if ('initial_option' in menu && menu.initial_option) {
    const match = emitted.get(fitOption(menu.initial_option).value);
    if (match) {
      menu.initial_option = match;
    } else {
      delete menu.initial_option;
    }
  }
  if ('initial_options' in menu && menu.initial_options) {
    const matches = menu.initial_options.flatMap((option) => {
      const match = emitted.get(fitOption(option).value);
      return match ? [match] : [];
    });
    if (matches.length > 0) {
      menu.initial_options = matches;
    } else {
      delete menu.initial_options;
    }
  }
  return menu;
};

const fitMenuFields = (
  menu: Exclude<SlackActionElement, SlackButtonElement>
): Exclude<SlackActionElement, SlackButtonElement> => {
  switch (menu.type) {
    case 'overflow':
      return fitFields(menu, SLACK_FIELD_LIMITS.overflow);
    case 'radio_buttons':
      return fitFields(menu, SLACK_FIELD_LIMITS.radio_buttons);
    case 'checkboxes':
      return fitFields(menu, SLACK_FIELD_LIMITS.checkboxes);
    case 'static_select':
      return fitFields(menu, SLACK_FIELD_LIMITS.static_select);
    case 'multi_static_select':
      return fitFields(menu, SLACK_FIELD_LIMITS.multi_static_select);
  }
};

// An image whose URL Slack would reject leaves its alt text.
const fitImageUrls = (block: SlackBlock): SlackBlock[] => {
  switch (block.type) {
    case 'image':
      return fitsImageUrl(block)
        ? [block]
        : block.alt_text
          ? [contextBlock([escapeMrkdwn(block.alt_text)])]
          : [];
    case 'context':
      return [
        {
          ...block,
          elements: block.elements.flatMap((element) =>
            element.type !== 'image' || fitsImageUrl(element)
              ? [element]
              : element.alt_text
                ? [{ type: 'mrkdwn', text: escapeMrkdwn(element.alt_text) }]
                : []
          ),
        },
      ];
    case 'section': {
      if (block.accessory?.type !== 'image' || fitsImageUrl(block.accessory)) {
        return [block];
      }
      const { accessory, ...rest } = block;
      return accessory.alt_text
        ? [rest, contextBlock([escapeMrkdwn(accessory.alt_text)])]
        : [rest];
    }
    default:
      return [block];
  }
};

export const fitBlock = (block: SlackBlock): SlackBlock[] => {
  if (isUnmodeledSlackBlock(block)) {
    return [block];
  }
  return block.type === 'container'
    ? fitContainer(block)
    : fitImageUrls(block).map(fitBlockText);
};

const fitContainer = (container: SlackContainerBlock): SlackBlock[] => {
  const { rich_text_title, icon, child_blocks } = container;
  const fitted: SlackContainerBlock = {
    ...fitFields(container, SLACK_FIELD_LIMITS.container),
    ...(rich_text_title && {
      rich_text_title: {
        ...rich_text_title,
        elements: rich_text_title.elements.flatMap(splitRichTextElement),
      },
    }),
  };
  if (icon && fitsImageUrl(icon)) {
    fitted.icon = fitImageElement(icon);
  } else {
    delete fitted.icon;
  }
  return containerWithChildren(fitted, child_blocks.flatMap(fitBlock));
};

// Pack renderers build their own blocks, and one overlong text makes Slack
// reject the whole message.
const fitBlockText = (block: SlackBlock): SlackBlock => {
  switch (block.type) {
    case 'header':
      return fitFields(block, SLACK_FIELD_LIMITS.header);
    case 'section':
      return {
        ...fitFields(block, SLACK_FIELD_LIMITS.section),
        ...(block.accessory && {
          accessory:
            block.accessory.type === 'image'
              ? fitImageElement(block.accessory)
              : fitControl(block.accessory),
        }),
      };
    case 'rich_text':
      return {
        ...block,
        elements: block.elements.flatMap(splitRichTextElement),
      };
    case 'context':
      return fitFields(
        {
          ...block,
          elements: block.elements.map((element) =>
            element.type === 'image' ? fitImageElement(element) : element
          ),
        },
        SLACK_FIELD_LIMITS.context
      );
    case 'image':
      return fitFields(block, SLACK_FIELD_LIMITS.image);
    case 'video':
      return fitFields(block, SLACK_FIELD_LIMITS.video);
    case 'actions':
      return { ...block, elements: block.elements.map(fitControl) };
    default:
      return block;
  }
};
