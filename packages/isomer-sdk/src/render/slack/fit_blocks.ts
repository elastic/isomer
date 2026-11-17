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
  type SlackContainerBlock,
  type SlackOptionObject,
  type SlackTextObject,
} from './blocks';
import { containerWithChildren } from './container';
import { contextBlock } from './context_block';
import {
  clampMrkdwn,
  clampSlackText,
  cutSlackValue,
  escapeMrkdwn,
} from './format';
import { splitRichTextElement } from './split_rich_text';
import { isUnmodeledSlackBlock } from './unmodeled';

const clampText = <TText extends SlackTextObject>(
  text: TText,
  max: number
): TText =>
  text.text.length <= max
    ? text
    : {
        ...text,
        text: (text.type === 'mrkdwn' ? clampMrkdwn : clampSlackText)(
          text.text,
          max
        ),
      };

const fitsImageUrl = ({ image_url }: { image_url?: string }): boolean =>
  image_url === undefined || image_url.length <= SLACK_LIMITS.imageUrlChars;

const clampAlt = <TImage extends { alt_text: string }>(
  image: TImage
): TImage =>
  image.alt_text.length <= SLACK_LIMITS.imageAltTextChars
    ? image
    : {
        ...image,
        alt_text: clampSlackText(
          image.alt_text,
          SLACK_LIMITS.imageAltTextChars
        ),
      };

// A cut URL would point somewhere else, so one past the limit is dropped.
const withoutLongUrl = <T extends { url?: string }>(element: T): T => {
  if (
    element.url === undefined ||
    element.url.length <= SLACK_LIMITS.urlChars
  ) {
    return element;
  }
  const { url: _dropped, ...rest } = element;
  return rest as T;
};

const optionValue = (value: string): string =>
  cutSlackValue(value, SLACK_LIMITS.optionValueChars);

const clampOption = (option: SlackOptionObject): SlackOptionObject =>
  withoutLongUrl({
    ...option,
    text: clampText(option.text, SLACK_LIMITS.optionTextChars),
    value: optionValue(option.value),
    ...(option.description && {
      description: clampText(option.description, SLACK_LIMITS.optionTextChars),
    }),
  });

const clampControl = (element: SlackActionElement): SlackActionElement => {
  const actionId =
    element.action_id === undefined
      ? {}
      : {
          action_id: cutSlackValue(
            element.action_id,
            SLACK_LIMITS.actionIdChars
          ),
        };
  if (element.type === 'button') {
    return withoutLongUrl({
      ...element,
      ...actionId,
      text: clampText(element.text, SLACK_LIMITS.buttonTextChars),
      ...(element.value !== undefined && {
        value: cutSlackValue(element.value, SLACK_LIMITS.buttonValueChars),
      }),
    });
  }
  const menu = { ...element, ...actionId };
  const maxOptions =
    menu.type === 'overflow'
      ? SLACK_LIMITS.optionsPerOverflow
      : menu.type === 'radio_buttons' || menu.type === 'checkboxes'
        ? SLACK_LIMITS.optionsPerChoice
        : SLACK_LIMITS.optionsPerSelect;
  if (menu.options) {
    menu.options = menu.options.slice(0, maxOptions).map(clampOption);
  }
  if ('placeholder' in menu && menu.placeholder) {
    menu.placeholder = clampText(
      menu.placeholder,
      SLACK_LIMITS.placeholderChars
    );
  }
  if ('option_groups' in menu && menu.option_groups) {
    menu.option_groups = menu.option_groups
      .slice(0, SLACK_LIMITS.optionGroupsPerSelect)
      .map((group) => ({
        ...group,
        label: clampText(group.label, SLACK_LIMITS.optionGroupLabelChars),
        options: group.options.slice(0, maxOptions).map(clampOption),
      }));
  }
  // Slack requires an initial option to equal one it emits, so each is
  // replaced by the emitted option of the same value, or dropped.
  const emitted = new Map(
    [
      ...(menu.options ?? []),
      ...(('option_groups' in menu && menu.option_groups) || []).flatMap(
        ({ options }) => options
      ),
    ].map((option) => [option.value, option])
  );
  if ('initial_option' in menu && menu.initial_option) {
    const match = emitted.get(optionValue(menu.initial_option.value));
    if (match) {
      menu.initial_option = match;
    } else {
      delete menu.initial_option;
    }
  }
  if ('initial_options' in menu && menu.initial_options) {
    const matches = menu.initial_options.flatMap(({ value }) => {
      const match = emitted.get(optionValue(value));
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
    : fitImageUrls(block).map(clampBlockText);
};

const fitContainer = (container: SlackContainerBlock): SlackBlock[] => {
  const { title, rich_text_title, subtitle, icon, child_blocks } = container;
  const fitted: SlackContainerBlock = {
    ...container,
    ...(title && {
      title: clampText(title, SLACK_LIMITS.containerTitleChars),
    }),
    ...(rich_text_title && {
      rich_text_title: {
        ...rich_text_title,
        elements: rich_text_title.elements.flatMap(splitRichTextElement),
      },
    }),
    ...(subtitle && {
      subtitle: clampText(subtitle, SLACK_LIMITS.containerSubtitleChars),
    }),
  };
  if (icon && fitsImageUrl(icon)) {
    fitted.icon = clampAlt(icon);
  } else {
    delete fitted.icon;
  }
  return containerWithChildren(fitted, child_blocks.flatMap(fitBlock));
};

// Pack renderers build their own blocks, and one overlong text makes Slack
// reject the whole message.
const clampBlockText = (block: SlackBlock): SlackBlock => {
  switch (block.type) {
    case 'header':
      return {
        ...block,
        text: clampText(block.text, SLACK_LIMITS.headerTextChars),
      };
    case 'section':
      return {
        ...block,
        ...(block.text && {
          text: clampText(block.text, SLACK_LIMITS.sectionTextChars),
        }),
        ...(block.fields && {
          fields: block.fields.map((field) =>
            clampText(field, SLACK_LIMITS.sectionFieldChars)
          ),
        }),
        ...(block.accessory && {
          accessory:
            block.accessory.type === 'image'
              ? clampAlt(block.accessory)
              : clampControl(block.accessory),
        }),
      };
    case 'rich_text':
      return {
        ...block,
        elements: block.elements.flatMap(splitRichTextElement),
      };
    case 'context':
      return {
        ...block,
        elements: block.elements.map((element) =>
          element.type === 'image'
            ? clampAlt(element)
            : clampText(element, SLACK_LIMITS.contextElementChars)
        ),
      };
    case 'image':
      return {
        ...clampAlt(block),
        ...(block.title && {
          title: clampText(block.title, SLACK_LIMITS.imageTitleChars),
        }),
      };
    case 'video':
      return {
        ...block,
        title: clampText(block.title, SLACK_LIMITS.videoTitleChars),
        ...(block.description && {
          description: clampText(
            block.description,
            SLACK_LIMITS.videoDescriptionChars
          ),
        }),
        ...(block.author_name !== undefined && {
          author_name: clampSlackText(
            block.author_name,
            SLACK_LIMITS.videoAuthorNameChars
          ),
        }),
      };
    case 'actions':
      return { ...block, elements: block.elements.map(clampControl) };
    default:
      return block;
  }
};
